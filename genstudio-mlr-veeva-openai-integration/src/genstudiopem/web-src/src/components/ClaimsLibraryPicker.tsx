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

import { Item, Picker } from "@adobe/react-spectrum";
import React, { Key, useEffect, useState } from "react";
import { Claim } from "@adobe/genstudio-uix-sdk";
import { getClaims } from "../utils/claimsSource";
import { useGuestConnection } from "../hooks";
import { extensionId } from "../Constants";

interface ClaimsLibrary {
  id: string;
  name: string;
  claims: Claim[];
}

interface Auth {
  imsToken: string;
  imsOrg: string;
}

interface ClaimsCheckerProps {
  handleSelectionChange: (library: Key | null, claims: Claim[]) => void;
  guestConnection: any;
}

export const ClaimsLibraryPicker = ({
  handleSelectionChange,
  guestConnection,
}: ClaimsCheckerProps): JSX.Element => {
  const [libraries, setLibraries] = useState<ClaimsLibrary[]>([]);
  const [auth, setAuth] = useState<Auth | null>(null);

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

  useEffect(() => {
    const pollForClaims = async () => {
      if (!auth?.imsToken || !auth?.imsOrg) {
        console.log('Auth not ready yet');
        return;
      }

      let retries = 0;
      const maxRetries = 5;
      const interval = 3000;

      while (retries < maxRetries) {
        try {
          console.log(`Polling for claims attempt ${retries + 1}/${maxRetries}`);
          const claims = await getClaims(auth.imsToken, auth.imsOrg);
          
          if (claims && claims.length > 0) {
            console.log('Claims received:', {
              librariesCount: claims.length,
              libraries: claims
            });
            
            setLibraries(claims);
            return;
          } else {
            console.log('No claims received, retrying...');
          }
        } catch (error) {
          console.error('Error polling for claims:', error);
          // If we get an error, try using TEST_CLAIMS
          try {
            console.log('Falling back to TEST_CLAIMS...');
            const testClaims = await getClaims('', ''); // This will use TEST_CLAIMS
            if (testClaims && testClaims.length > 0) {
              console.log('Using TEST_CLAIMS:', testClaims);
              setLibraries(testClaims);
              return;
            }
          } catch (fallbackError) {
            console.error('Error using TEST_CLAIMS:', fallbackError);
          }
        }
        
        await new Promise((resolve) => setTimeout(resolve, interval));
        retries++;
      }
      
      console.log('Max retries reached for claims polling');
    };

    pollForClaims();
  }, [auth?.imsToken, auth?.imsOrg]);

  const handleSelection = (key: Key | null) => {
    console.log('Selection changed:', key);
    console.log('Selection type:', typeof key);
    const selectedLibrary = libraries.find(lib => lib.id === key);
    console.log('Selected library:', selectedLibrary);
    handleSelectionChange(selectedLibrary?.name || null, selectedLibrary?.claims || []);
  };

  console.log('Current libraries state:', JSON.stringify(libraries, null, 2));

  return (
    <Picker
      placeholder="Select Claims Category..."
      width="100%"
      onSelectionChange={handleSelection}
    >
      {libraries.map((library) => {
        console.log('Rendering library:', library);
        return (
          <Item key={library.id}>{library.name}</Item>
        );
      })}
    </Picker>
  );
};
