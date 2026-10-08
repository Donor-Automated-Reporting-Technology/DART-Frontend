<template>
  <AuthShell title="Create your account" subtitle="Free while we test. It takes about a minute.">
    <form class="ui-form" novalidate @submit.prevent="onSubmit">
      <!-- Progress: two short steps -->
      <div class="progress">
        <p class="progress-label" aria-live="polite">
          Step {{ step }} of 2 <span aria-hidden="true">·</span> {{ step === 1 ? 'Your organisation' : 'Your account' }}
        </p>
        <div class="progress-track" role="progressbar" aria-label="Sign-up progress" :aria-valuenow="step" aria-valuemin="1" aria-valuemax="2">
          <span class="progress-seg on" />
          <span class="progress-seg" :class="{ on: step === 2 }" />
        </div>
      </div>

      <!-- Step 1: organisation -->
      <div v-show="step === 1" class="ui-form" role="group" aria-label="Your organisation">
        <InputField
          id="orgName"
          v-model="form.organisation.name" placeholder="e.g. Hope for Children"
          label="Organisation name"
          autocomplete="organization"
          :error="errors['organisation.name']"
          required
          autofocus
          @blur="onBlur('organisation.name')"
        />

        <CountrySelect
          id="country"
          v-model="form.organisation.country"
          label="Country"
          :error="errors['organisation.country']"
          required
          @blur="onBlur('organisation.country')"
        />

        <TextAreaField
          v-if="showDescription"
          id="orgDesc"
          v-model="form.organisation.description" placeholder="What your organisation does, in a sentence or two"
          :rows="3"
          label="Short description"
          optional
          :error="errors['organisation.description']"
          :maxlength="1000"
          @blur="onBlur('organisation.description')"
        />
        <button v-else type="button" class="ui-btn ui-btn--text add-desc" @click="descriptionOpen = true">Add a short description (optional)</button>

        <button type="button" class="ui-btn ui-btn--primary ui-btn--block" @click="nextStep">Continue</button>
      </div>

      <!-- Step 2: account -->
      <div v-show="step === 2" class="ui-form" role="group" aria-label="Your account">
        <InputField
          id="fullName"
          v-model="form.user.full_name" placeholder="Your full name"
          label="Full name"
          autocomplete="name"
          :error="errors['user.full_name']"
          required
          @blur="onBlur('user.full_name')"
        />

        <InputField
          id="email"
          v-model="form.user.email" placeholder="you@organisation.org"
          type="email"
          inputmode="email"
          label="Work email"
          autocomplete="email"
          :error="errors['user.email']"
          required
          @blur="onBlur('user.email')"
        />

        <PasswordInput
          id="password"
          v-model="form.user.password" placeholder="At least 8 characters, with a number"
          label="Password"
          autocomplete="new-password"
          :error="errors['user.password']"
          required
          show-strength
          @blur="onBlur('user.password')"
        />

        <PasswordInput
          id="confirmPassword"
          v-model="form.user.confirm_password" placeholder="Type the password again"
          label="Confirm password"
          autocomplete="new-password"
          :error="errors['user.confirm_password']"
          required
          @blur="onBlur('user.confirm_password')"
        />

        <p v-if="apiError" class="ui-alert" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
          <span>{{ apiError }}</span>
        </p>

        <button
          type="submit"
          class="ui-btn ui-btn--primary ui-btn--block"
          :class="{ 'ui-btn--done': done }"
          :disabled="isSubmitting || done"
          :aria-busy="isSubmitting ? 'true' : undefined"
        >
          <template v-if="isSubmitting"><span class="ui-spinner" aria-hidden="true" />Creating your account…</template>
          <template v-else-if="done">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            Account created
          </template>
          <template v-else>Create account</template>
        </button>
        <button type="button" class="ui-btn ui-btn--text back-step" :disabled="isSubmitting || done" @click="goToStep(1)">Back to organisation details</button>
        <p class="visually-hidden" aria-live="polite">{{ isSubmitting ? 'Creating your account' : done ? 'Account created, opening your dashboard' : '' }}</p>
      </div>
    </form>

    <template #switch>
      Already have an account? <NuxtLink to="/login" class="ui-link">Log in</NuxtLink>
    </template>
  </AuthShell>
</template>

<script setup lang="ts">
import AuthShell from '../components/brand/AuthShell.vue';
import { useRegistration } from '../composables/useRegistration';
import { useRouter } from 'vue-router';
import InputField from '../components/interfaces/InputField.vue';
import TextAreaField from '../components/interfaces/TextAreaField.vue';
import PasswordInput from '../components/interfaces/PasswordInput.vue';
import CountrySelect from '../components/interfaces/CountrySelect.vue';
import { computed, nextTick, ref, watch } from 'vue';

const router = useRouter();
const { form, errors, apiError, isSubmitting, validate, submit } = useRegistration();

const step = ref<1 | 2>(1);
const done = ref(false);

const ORG_FIELDS = ['organisation.name', 'organisation.country', 'organisation.description'];
const FIELD_IDS: Record<string, string> = {
  'organisation.name': 'orgName',
  'organisation.country': 'country',
  'organisation.description': 'orgDesc',
  'user.full_name': 'fullName',
  'user.email': 'email',
  'user.password': 'password',
  'user.confirm_password': 'confirmPassword',
};

// The optional description stays tucked away unless it is opened, filled or has an error.
const descriptionOpen = ref(false);
const showDescription = computed(() =>
  descriptionOpen.value || !!form.organisation.description || !!errors.value?.['organisation.description']
);

// Re-run the composable's own validation, but only update the given fields,
// so errors appear as the user leaves a field without flagging untouched ones.
const refresh = (fields: string[]) => {
  const previous = { ...errors.value };
  validate();
  const fresh = errors.value;
  const next = { ...previous };
  for (const f of fields) {
    delete next[f];
    if (fresh[f]) next[f] = fresh[f];
  }
  errors.value = next;
  return fields.filter(f => fresh[f]);
};

// Leaving an empty field the user hasn't typed in stays quiet (no error that
// shifts the layout under the pointer); required fields are flagged on submit.
const valueOf = (field: string) => {
  const [group, key] = field.split('.') as ['organisation' | 'user', string];
  return String((form[group] as Record<string, unknown>)[key] ?? '');
};
const onBlur = (field: string) => {
  if (!valueOf(field) && !errors.value[field]) return;
  refresh([field]);
};

// Once a field shows an error, re-check it as the user types so the message
// clears the moment the value is fixed (no layout jump on the next click).
watch(
  () => Object.keys(FIELD_IDS).map(valueOf).join('\u0000'),
  () => {
    const shown = Object.keys(FIELD_IDS).filter(f => errors.value[f]);
    if (shown.length) refresh(shown);
  },
);

const focusField = async (field: string) => {
  await nextTick();
  document.getElementById(FIELD_IDS[field] ?? '')?.focus();
};

const goToStep = async (n: 1 | 2) => {
  step.value = n;
  await focusField(n === 1 ? 'organisation.name' : 'user.full_name');
};

const nextStep = async () => {
  const invalid = refresh(ORG_FIELDS);
  if (invalid.length) {
    await focusField(invalid[0]!);
    return;
  }
  await goToStep(2);
};

const onSubmit = async () => {
  if (step.value === 1) return nextStep();
  const success = await submit();
  if (success) {
    done.value = true;
    router.push('/dashboard');
    return;
  }
  // Send the user back to the first step that needs attention.
  const firstInvalid = Object.keys(FIELD_IDS).find(k => errors.value[k]);
  if (firstInvalid) {
    if (ORG_FIELDS.includes(firstInvalid)) step.value = 1;
    await focusField(firstInvalid);
  }
};
</script>

<style scoped>
.progress { display: flex; flex-direction: column; gap: 8px; }
.progress-label { margin: 0; font-size: 13px; color: var(--text-secondary); }
.progress-track { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.progress-seg { height: 4px; border-radius: 999px; background: var(--border-color); transition: background-color 150ms ease; }
.progress-seg.on { background: var(--primary); }
.add-desc { align-self: flex-start; margin-top: -8px; }
.back-step { align-self: center; margin-top: -8px; }
</style>
