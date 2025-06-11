/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { Claim, Experience, ExperienceService } from "@adobe/genstudio-uix-sdk";
import {
  Button,
  Divider,
  Flex,
  Heading,
  Item,
  Picker,
  ProgressCircle,
  Text,
  View,
} from "@adobe/react-spectrum";
import React, { useEffect, useState, type Key } from "react";

import { extensionId } from "../Constants";
import { getClaims } from "../utils/claimsSource";
import { useGuestConnection } from "../hooks";
import { ClaimResults } from "../types";
import { validateClaimsWithOpenAI } from "../utils/openAiValidation";
import { checkCharacterLimits } from "../utils/claimsValidation";
import ClaimsChecker from "./ClaimsChecker";
import { actionWebInvoke } from "../utils/actionWebInvoke";
import { ClaimsLibrary } from "../utils/veevaClaimsFetcher";

import {
  getSelectedExperienceId,
  setSelectedExperienceId,
  SELECTED_EXPERIENCE_ID_STORAGE_KEY,
} from "../utils/experienceBridge";

interface Auth {
  imsToken: string;
  imsOrg: string;
}

interface ClaimsFinderAction {
  "veeva": string;
}

const actions: ClaimsFinderAction = {
  "veeva": "/api/veeva"
};

interface IMSProfile {
  token: string;
  org: string;
}

interface GuestConnection {
  getIMSProfile(): IMSProfile | null;
  // ... other methods
}

interface ClaimsFinderResponse {
  claims: Claim[];
}

const validateClaimsResponse = (response: unknown): response is ClaimsFinderResponse => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'claims' in response &&
    Array.isArray((response as ClaimsFinderResponse).claims)
  );
};

const RightPanelComponent = (): JSX.Element => {
  const [experiences, setExperiences] = useState<Experience[] | null>(null);
  const [selectedExperienceIndex, setSelectedExperienceIndex] = useState<
    number | null
  >(null);
  const [currentExperience, setCurrentExperience] = useState<Experience | null>(
    null
  );
  const [claimsResults, setClaimsResults] = useState<ClaimResults[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [testClaims, setTestClaims] = useState<Claim[]>([]);
  const [isPollingClaims, setIsPollingClaims] = useState(false);
  const [claimsData, setClaimsData] = useState<{ id: string; description: string }[]>([]);

  const guestConnection = useGuestConnection(extensionId);

  useEffect(() => {
    if (guestConnection) pollForExperiences();
  }, [guestConnection]);

  // Initialize auth state from guest connection
  useEffect(() => {
    if (guestConnection) {
      try {
        const sharedAuth = guestConnection.sharedContext.get("auth");
        if (sharedAuth) {
          setAuth(sharedAuth as Auth);
          console.log('IMS Profile from shared context:', {
            orgId: sharedAuth.imsOrg,
            hasToken: !!sharedAuth.imsToken
          });
        } else {
          console.error('No auth found in shared context');
        }
      } catch (error) {
        console.error('Error getting auth from shared context:', error);
      }
    } else {
      console.log('Guest connection not available yet');
    }
  }, [guestConnection]);

  // Poll for claims
  useEffect(() => {
    let isMounted = true;
    
    const poll = async () => {
      if (!isMounted) return;
      if (guestConnection) {
        pollForClaims();
      }
    };

    poll();
    
    return () => {
      isMounted = false;
    };
  }, [guestConnection, auth]);

  // Check if we need a more explicit claims check trigger
  useEffect(() => {
    if (selectedExperienceIndex !== null) handleRunClaimsCheck();
  }, [selectedExperienceIndex]);

  // if experiences are loaded or changed, set the selected experience index
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SELECTED_EXPERIENCE_ID_STORAGE_KEY && event.newValue) {
        const index = getExperienceIndex(event.newValue);
        setSelectedExperienceIndex(index);
      }
    };
    const selectedExperienceId = getSelectedExperienceId();
    if (selectedExperienceId && experiences?.length) {
      const index = getExperienceIndex(selectedExperienceId);
      setSelectedExperienceIndex(index);
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [experiences]);

  const handleRunClaimsCheck = async () => {
    if (selectedExperienceIndex === null) return;
    const newExperiences = await syncExperiences();
    if (!newExperiences?.length) return;

    // Always run validation when button is clicked
    runClaimsCheck(newExperiences);
  };

  const getExperienceIndex = (experienceId: string): number => {
    if (!experiences?.length) return 0;
    const index = experiences.findIndex((exp) => exp.id === experienceId);
    return index !== -1 ? index : 0;
  };

  const syncExperiences = async (): Promise<Experience[] | null> => {
    if (!guestConnection) return null;

    setIsSyncing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const remoteExperiences = await ExperienceService.getExperiences(
        guestConnection
      );
      if (remoteExperiences && remoteExperiences.length > 0) {
        setExperiences(remoteExperiences);
        return remoteExperiences;
      }
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const runClaimsCheck = async (experiences: Experience[]): Promise<void> => {
    setIsLoading(true);
    try {
      if (!auth?.imsToken || !auth?.imsOrg || selectedExperienceIndex === null) {
        console.error('Auth not available for claims check or no experience selected');
        return;
      }

      // Only fetch claims if we don't have them
      let claimsToUse = claimsData;
      if (claimsToUse.length === 0) {
        console.log('Getting claims for imsToken and imsOrg', auth.imsToken, auth.imsOrg);
        const claimsLibraries = await getClaims(auth.imsToken, auth.imsOrg);
        console.log('Raw claims libraries from Veeva:', claimsLibraries);
        const allClaims = claimsLibraries.flatMap(lib => lib.claims);
        console.log('Flattened claims array:', allClaims);
        setClaimsData(allClaims);
        claimsToUse = allClaims; // Use the claims directly instead of waiting for state update
      }

      // Only validate the selected experience
      const selectedExperience = experiences[selectedExperienceIndex];
      console.log('Current claimsData state:', claimsToUse);
      console.log('Validating experience with claims:', {
        experience: selectedExperience,
        claims: claimsToUse
      });

      const aiResult = await validateClaimsWithOpenAI(selectedExperience, claimsToUse);
      
      // Local character checks
      for (const [field, entry] of Object.entries(selectedExperience.experienceFields)) {
        if (typeof entry.fieldValue === "string") {
          const charLimitResult = checkCharacterLimits(field, entry.fieldValue);
          if (charLimitResult && charLimitResult.status === "violated") {
            if (!aiResult[field]) aiResult[field] = [];
            aiResult[field].push(charLimitResult);
          }
        }
      }

      // Create array with null for other experiences
      const results = new Array(experiences.length).fill(null);
      results[selectedExperienceIndex] = aiResult;
      setClaimsResults(results);
    } catch (error) {
      console.error("Error in claims validation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const pollForExperiences = async () => {
    setIsPolling(true);
    let retries = 0;
    const maxRetries = 10;
    const interval = 2000; // 2 seconds

    while (retries < maxRetries) {
      const hasExperiences = await syncExperiences();
      if (hasExperiences) {
        setIsPolling(false);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
      retries++;
    }
    setIsPolling(false);
  };

  const pollForClaims = async () => {
    if (!auth?.imsToken || !auth?.imsOrg) {
      console.log('Auth not available, skipping claims polling');
      return;
    }

    setIsPollingClaims(true);
    let retries = 0;
    const maxRetries = 5;
    const interval = 3000;

    while (retries < maxRetries) {
      try {
        console.log(`Polling for claims attempt ${retries + 1}/${maxRetries}`);
        const claimsLibraries = await getClaims(auth.imsToken, auth.imsOrg);
        
        if (claimsLibraries && claimsLibraries.length > 0) {
          // Flatten the claims from all libraries
          const allClaims = claimsLibraries.flatMap(lib => lib.claims);
          
          console.log('Claims received:', {
            librariesCount: claimsLibraries.length,
            totalClaims: allClaims.length
          });
          
          setClaimsData(allClaims);
          setIsPollingClaims(false);
          return;
        }
      } catch (error) {
        console.error('Error polling for claims:', error);
      }
      
      await new Promise((resolve) => setTimeout(resolve, interval));
      retries++;
    }
    
    console.log('Max retries reached for claims polling');
    setIsPollingClaims(false);
  };

  // (Optional) If handleSelectedExperienceChange is provided in ExtensionRegistration
  //            host app will render a experience selector at the top of the right panel
  //            Note that this does not control the create canvas and so selection is not sync back to the host app
  // const handleExperienceSelection = (key: Key | null) => {
  //   if (!key) return;
  //   setSelectedExperienceId(key as string);
  //   // This is called because storage event is not designed to fired on same tab
  //   setSelectedExperienceIndex(getExperienceIndex(key as string));
  // };
  // const renderExperiencePicker = () => {
  //   if (!experiences) return null;
  //   return (
  //     <Picker
  //       label="Select experience"
  //       align="start"
  //       isDisabled={isSyncing}
  //       selectedKey={experiences[selectedExperienceIndex ?? 0].id}
  //       onSelectionChange={handleExperienceSelection}
  //     >
  //       {experiences.map((experience, index) => (
  //         <Item key={experience.id}>{`Experience ${index + 1}`}</Item>
  //       ))}
  //     </Picker>
  //   );
  // };

  const renderRunClaimsCheckButton = () => {
    if (selectedExperienceIndex === null) return null;

    return (
      <Button
        variant="primary"
        isDisabled={isLoading}
        onPress={handleRunClaimsCheck}
      >
        Run Claims Check
      </Button>
    );
  };

  const renderLoadingIndicator = () => (
    <Flex height="100%" alignItems="center" justifyContent="center">
      <ProgressCircle aria-label="Loading" isIndeterminate />
    </Flex>
  );

  const renderResults = () => {
    if (!claimsResults || selectedExperienceIndex === null) return null;

    return (
      <ClaimsChecker
        claims={claimsResults}
        experienceNumber={selectedExperienceIndex}
      />
    );
  };

  const renderClaimsChecker = () => (
    <Flex height="100%" direction="column" marginY="size-200" gap="size-400">
      <Flex direction="column" gap="size-200">
        <Heading level={2} marginY="size-0">
          Check Claims
        </Heading>
        <Flex direction="column" gap="size-300">
          {/* (Optional) If handleSelectedExperienceChange is provided in ExtensionRegistration
                         host app will render a experience selector at the top of the right panel
          {renderExperiencePicker()} */}
          {renderRunClaimsCheckButton()}
        </Flex>
      </Flex>
      {(isLoading || claimsResults) && <Divider size="S" />}
      {isLoading ? renderLoadingIndicator() : renderResults()}
    </Flex>
  );

  const renderWaitingForExperiences = () => (
    <Flex
      height="100%"
      direction="column"
      alignItems="center"
      justifyContent="center"
      gap="size-200"
    >
      <ProgressCircle aria-label="Loading" isIndeterminate />
      {isPolling && <Text>Waiting for experiences to be ready...</Text>}
      {isPollingClaims && <Text>Fetching claims...</Text>}
    </Flex>
  );

  return (
    <View backgroundColor="static-white" height="100vh">
      <Flex height="100%" direction="column" marginX="size-200">
        {experiences && experiences.length > 0
          ? renderClaimsChecker()
          : renderWaitingForExperiences()}
      </Flex>
    </View>
  );
};

export default RightPanelComponent;
