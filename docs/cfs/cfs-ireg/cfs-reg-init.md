Registration covers the full lifecycle of enrolling a new child in the CFS programme — from deduplication search through to the beneficiary record being created. Registration is a less frequent action than attendance and is primarily performed by Regina (case worker).

US-CFS-REG-001  Beneficiary registration

Role: Regina (Case worker) / Peter (Facilitator)    Priority: Critical    Status: Planned

As a case worker or facilitator, I want to register a new child at my CFS location by capturing their full identity and medical context so that they have a beneficiary ID and can be added to session attendance.

South Sudan naming convention

Names in South Sudan follow a four-part convention: personal name, father's name, grandfather's name, and family/clan name. The registration form must capture all four parts. Father's name is the primary deduplication signal. The system must not treat the full name as a single string.

Acceptance criteria

The registration flow is only accessible after completing a duplicate search (US-CFS-REG-002). The form cannot be reached without a search step.

The registration form captures: personal_name (required), father_name (required), grandfather_name (optional), family_name (optional), age_at_registration (required, integer 0–25), sex (required, male/female), language (required, from country config list), disability_status (required, enum), guardian_name (required), guardian_phone (optional), known_medical_issues (optional, free text), known_learning_difficulties (optional, free text), additional_notes (optional, free text), primero_case_id (optional).

The CFS location pre-fills from the user's current active assignment. It cannot be manually changed — the registrar is always registering for their assigned location.

On save, the system generates a UUID as the beneficiary_id client-side and creates both a beneficiaries record and a cfs_registrations record.

The new record is queued in IndexedDB for sync if offline. The sync status indicator shows 'pending sync'.

After successful save, the screen shows a confirmation with the beneficiary's name and a generated beneficiary ID reference. The registrar can start a new registration or go to the attendance screen.

The form validates required fields client-side before allowing submission. Age must be 0–25. Sex must be male or female. Disability status must be from the enum.

