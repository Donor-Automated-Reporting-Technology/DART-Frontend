T-REG-001-04

Frontend: Registration form — four name fields, age, sex, language, disability, guardian fields, medical context fields, Primero ID

Frontend

5h

T-REG-001-03

T-REG-001-05

Frontend: Auto-fill CFS location from user's active assignment (read from local config, not user-editable)

Frontend

1h

T-REG-001-04

T-REG-001-06

Frontend: Client-side UUID generation for beneficiary_id at point of save

Frontend

1h

T-REG-001-04


# Create Beneficiary API

**Endpoint**: `POST /api/v1/cfs/beneficiaries`
**Description**: Creates the core demographic record for a child. Validates all required fields before creation.

## Request Payload

```json
{
  "personal_name": "Amina",               
  "father_name": "Majid",                 
  "grandfather_name": "Omar",             
  "family_name": "Deng",                  
  "age_at_registration": 8,               
  "sex": "female",                        
  "language": "Juba Arabic",              
  "disability_status": "None",            
  "guardian_name": "Mary Deng",           
  "guardian_phone": "+211912345678",      
  "known_medical_issues": "",             
  "known_learning_difficulties": "",      
  "additional_notes": "",                 
  "primero_case_id": ""                   
}
```

## Success Response (`201 Created`)

```json
{
  "message": "Beneficiary created successfully",
  "beneficiary": {
    "id": "e44d310e-96af-42e7-9a99-923f03b291db",
    "organisation_id": "...",
    "personal_name": "Amina",
    "father_name": "Majid",
    "grandfather_name": "Omar",
    "family_name": "Deng",
    "age_at_registration": 8,
    "sex": "female",
    "language": "Juba Arabic",
    "disability_status": "None",
    "guardian_name": "Mary Deng",
    "guardian_phone": "+211912345678",
    "created_at": "2026-03-24T00:00:00Z",
    "updated_at": "2026-03-24T00:00:00Z"
  }
}
```

## Frontend Integration Example (Nuxt / Vue)

You can call this API from a Vue component setup script or a Pinia store using `$fetch`.

```typescript
// 1. Function to create the core record
async function createBeneficiary(formData) {
  try {
    const response = await $fetch('/api/v1/cfs/beneficiaries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.value}`, // Pass the active user session token
        'Content-Type': 'application/json'
      },
      body: formData
    });

    // Extract the generated ID provided by the backend response
    const newBeneficiaryId = response.beneficiary.id;
    console.log("Successfully created Beneficiary ID:", newBeneficiaryId);
    
    return newBeneficiaryId;
  } catch (error) {
    console.error("Failed to register beneficiary:", error.data);
    throw error;
  }
}
```


# Create CFS Registration API

**Endpoint:** `POST /api/v1/cfs/registrations`
**Description:** Links an existing beneficiary to the active CFS location of the logged-in user.

## Request Payload

```json
{
  "beneficiary_id": "e44d310e-96af-42e7-9a99-923f03b291db"  // Expected to be a valid UUID string
}
```

## Success Response (`201 Created`)

```json
{
  "message": "CFS Registration created successfully",
  "registration": {
    "id": "a11b222c-333d-444e-555f-666g777h888i",
    "organisation_id": "...",
    "beneficiary_id": "e44d310e-96af-42e7-9a99-923f03b291db",
    "cfs_location_id": "...",
    "registered_by": "...",
    "registration_date": "2026-03-24T00:00:00Z",
    "created_at": "2026-03-24T00:00:00Z",
    "updated_at": "2026-03-24T00:00:00Z"
  }
}
```

## Frontend Integration Example (Nuxt / Vue)

You typically call this API *immediately after* the Create Beneficiary API responds with a new `id`. This will finalize their enrollment.

```typescript
// 2. Function to link the beneficiary to the location
async function linkBeneficiaryToCFSLocation(beneficiaryId: string) {
  try {
    const response = await $fetch('/api/v1/cfs/registrations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.value}`,
        'Content-Type': 'application/json'
      },
      body: {
        beneficiary_id: beneficiaryId
      }
    });

    console.log("Registration complete! Location linked.", response.registration);
    return response.registration;
  } catch (error) {
    console.error("Failed to link beneficiary to location:", error.data);
    throw error;
  }
}

// ------------------------------------------------------------------------
// Full Frontend Component Flow: Combining both parts on a "Save" button press
// ------------------------------------------------------------------------
async function handleFullRegistrationSubmit(formData) {
  try {
    // Step 1: Create the Beneficiary Record
    const newBeneId = await createBeneficiary(formData);
    
    // Step 2: Link them to the current Location using the ID we just received
    await linkBeneficiaryToCFSLocation(newBeneId);
    
    // Step 3: Feedback to user
    alert("Registration fully completed!");
    
    // Redirect user to the child list or attendance page
    router.push('/cfs/beneficiaries');
  } catch (err) {
    alert("An error occurred during registration. Please check inputs.");
  }
}
```
