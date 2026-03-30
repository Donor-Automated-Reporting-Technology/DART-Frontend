import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import { cfsApi } from '../services/cfsApi';
import { ApiError } from '../services/api';
import {
  saveBeneficiaryOffline,
  saveCfsRegistrationOffline,
} from '../services/offlineDb';
import type { RegisterBeneficiaryPayload } from '../interfaces/cfs';

export const useCfsRegistration = () => {
  const router = useRouter();

  const form = reactive<RegisterBeneficiaryPayload>({
    personal_name: '',
    father_name: '',
    grandfather_name: '',
    family_name: '',
    age_at_registration: 0,
    sex: '',
    language: '',
    disability_status: '',
    guardian_name: '',
    guardian_phone: '',
    known_medical_issues: '',
    known_learning_difficulties: '',
    additional_notes: '',
    primero_case_id: ''
  });

  const errors = ref<Record<string, string>>({});
  const apiError = ref<string>('');
  const isSubmitting = ref(false);

  const validate = () => {
    errors.value = {};
    let isValid = true;

    if (!form.personal_name || form.personal_name.trim().length === 0) {
      errors.value['personal_name'] = 'Personal name is required';
      isValid = false;
    }

    if (!form.father_name || form.father_name.trim().length === 0) {
      errors.value['father_name'] = 'Father\'s name is required';
      isValid = false;
    }

    if (form.age_at_registration === null || form.age_at_registration === undefined || isNaN(form.age_at_registration) || form.age_at_registration < 0 || form.age_at_registration > 25) {
      errors.value['age_at_registration'] = 'Age must be between 0 and 25';
      isValid = false;
    }

    if (!form.sex) {
      errors.value['sex'] = 'Sex is required';
      isValid = false;
    } else if (form.sex !== 'male' && form.sex !== 'female') {
      errors.value['sex'] = 'Sex must be either male or female';
      isValid = false;
    }

    if (!form.language || form.language.trim().length === 0) {
      errors.value['language'] = 'Language is required';
      isValid = false;
    }

    if (!form.disability_status) {
      errors.value['disability_status'] = 'Disability status is required';
      isValid = false;
    }

    if (!form.guardian_name || form.guardian_name.trim().length === 0) {
      errors.value['guardian_name'] = 'Guardian name is required';
      isValid = false;
    }

    return isValid;
  };

  const submit = async () => {
    apiError.value = '';

    if (!validate()) {
      return false;
    }

    isSubmitting.value = true;
    try {
      // Generate a client-side UUID for offline-first
      const localId = uuidv4();
      const now = new Date().toISOString();

      // Save to IndexedDB immediately (offline-first)
      await saveBeneficiaryOffline({
        id: localId,
        personalName: form.personal_name,
        fatherName: form.father_name,
        grandfatherName: form.grandfather_name ?? '',
        familyName: form.family_name ?? '',
        ageAtRegistration: form.age_at_registration,
        sex: form.sex,
        language: form.language,
        disabilityStatus: form.disability_status,
        guardianName: form.guardian_name,
        guardianPhone: form.guardian_phone ?? '',
        knownMedicalIssues: form.known_medical_issues ?? '',
        knownLearningDifficulties: form.known_learning_difficulties ?? '',
        additionalNotes: form.additional_notes ?? '',
        primeroCaseId: form.primero_case_id ?? '',
        syncStatus: 'pending',
        clientTimestamp: now,
      });

      // Save the CFS registration record (links beneficiary to location)
      const regId = uuidv4();
      await saveCfsRegistrationOffline({
        id: regId,
        beneficiaryId: localId,
        syncStatus: 'pending',
        clientTimestamp: now,
      });

      // Try to sync immediately if online
      try {
        const beneficiaryResponse = await cfsApi.registerBeneficiary({ ...form });
        const serverId = beneficiaryResponse.beneficiary.id;

        // Update IndexedDB with server ID
        const { updateBeneficiarySyncStatus, updateCfsRegistrationSyncStatus } = await import('../services/offlineDb');
        await updateBeneficiarySyncStatus(localId, 'synced', serverId);

        // Link to CFS location on server
        await cfsApi.createCfsRegistration({ beneficiary_id: serverId });
        await updateCfsRegistrationSyncStatus(regId, 'synced', serverId);
      } catch {
        // Sync failed — data is safe in IndexedDB, will sync later
      }

      // Reset form on success
      Object.keys(form).forEach((key) => {
        (form as any)[key] = key === 'age_at_registration' ? 0 : '';
      });

      return localId;
    } catch (e: any) {
      if (e instanceof ApiError) {
        if (e.status === 400 && e.data?.errors) {
          errors.value = { ...errors.value, ...e.data.errors };
        } else {
          apiError.value = e.message || 'Beneficiary registration failed';
        }
      } else {
        apiError.value = 'Connection failed — check your internet connection and try again';
      }
      return false;
    } finally {
      isSubmitting.value = false;
    }
  };

  return { form, errors, apiError, isSubmitting, validate, submit };
};
