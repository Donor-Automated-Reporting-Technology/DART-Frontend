import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { registerOrganisation, ApiError } from "../services/api";
import type { RegisterPayload } from "../interfaces/auth";

export const useRegistration = () => {
  const router = useRouter();
  const authStore = useAuthStore();

  const form = reactive<RegisterPayload>({
    organisation: { name: "", description: "", country: "" },
    user: { full_name: "", email: "", password: "", confirm_password: "" },
  });

  const errors = ref<Record<string, string>>({});
  const apiError = ref<string>("");
  const isSubmitting = ref(false);

  const validate = () => {
    errors.value = {};
    let isValid = true;

    // organisation.name: present, length >= 2, length <= 255
    if (
      !form.organisation.name ||
      form.organisation.name.length < 2 ||
      form.organisation.name.length > 255
    ) {
      errors.value["organisation.name"] =
        "Organisation name must be between 2 and 255 characters";
      isValid = false;
    }

    // organisation.description: if provided, length <= 1000
    if (
      form.organisation.description &&
      form.organisation.description.length > 1000
    ) {
      errors.value["organisation.description"] =
        "Description must be under 1000 characters";
      isValid = false;
    }

    // organisation.country: selected from list - not empty string
    if (!form.organisation.country) {
      errors.value["organisation.country"] = "Country is required";
      isValid = false;
    }

    // user.full_name: present, length >= 2
    if (!form.user.full_name || form.user.full_name.length < 2) {
      errors.value["user.full_name"] =
        "Full name must be at least 2 characters";
      isValid = false;
    }

    // user.email: valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.user.email || !emailRegex.test(form.user.email)) {
      errors.value["user.email"] = "Valid email is required";
      isValid = false;
    }

    // user.password: length >= 8, contains at least one digit
    const digitRegex = /\d/;
    if (
      !form.user.password ||
      form.user.password.length < 8 ||
      !digitRegex.test(form.user.password)
    ) {
      errors.value["user.password"] =
        "Password must be at least 8 characters and contain a digit";
      isValid = false;
    }

    // user.confirm_password: exactly matches user.password
    if (form.user.password !== form.user.confirm_password) {
      errors.value["user.confirm_password"] = "Passwords do not match";
      isValid = false;
    }

    return isValid;
  };

  const submit = async () => {
    apiError.value = "";

    if (form.user.email) {
      form.user.email = form.user.email.toLowerCase();
    }

    if (!validate()) {
      return false;
    }

    isSubmitting.value = true;
    try {
      const payload: RegisterPayload = {
        organisation: { ...form.organisation },
        user: {
          full_name: form.user.full_name,
          email: form.user.email,
          password: form.user.password,
          confirm_password: form.user.confirm_password,
        },
      };

      const response = await registerOrganisation(payload);

      // ── Auto-login to obtain a valid session_id token ──────────────────────
      try {
        const loginRes = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: payload.user.email, password: payload.user.password })
        });
        const loginData = await loginRes.json().catch(() => ({}));
        if (loginRes.ok) {
          const lp = loginData.data;
          if (lp?.tokens?.access_token) authStore.setToken(lp.tokens.access_token);
          if (lp?.user?.full_name) authStore.setUserName(lp.user.full_name);
          if (lp?.user?.email) authStore.setUserEmail(lp.user.email);
          if (lp?.user?.id) authStore.setUserId(lp.user.id);
          authStore.setUserRole(lp?.user?.role ?? "org_admin");
          if (lp?.user?.organisation?.name) authStore.setOrgName(lp.user.organisation.name);
          if (lp?.user?.organisation?.id) authStore.setOrgId(lp.user.organisation.id);
          return true;
        }
      } catch (err) {
        // Fall back below if auto-login fails
      }

      // ── Hydrate auth store from registration response (Fallback) ──────────────
      if (response?.tokens?.access_token) authStore.setToken(response.tokens.access_token);
      if (response?.user?.full_name)
        authStore.setUserName(response.user.full_name);
      if (response?.user?.email) authStore.setUserEmail(response.user.email);
      if (response?.user?.id) authStore.setUserId(response.user.id);
      // Registering always creates an org_admin; fall back if API omits the field
      authStore.setUserRole(response?.user?.role ?? "org_admin");
      if (response?.organisation?.name)
        authStore.setOrgName(response.organisation.name);
      if (response?.organisation?.id)
        authStore.setOrgId(response.organisation.id);

      return true;
    } catch (e: any) {
      if (e instanceof ApiError) {
        if (e.status === 400 && e.data?.errors) {
          errors.value = { ...errors.value, ...e.data.errors };
        } else if (e.status === 409) {
          errors.value["user.email"] =
            "An account with this email already exists";
          document
            .getElementById("email")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (e.status === 429) {
          apiError.value =
            "Too many attempts — please wait before trying again";
        } else {
          apiError.value = e.message || "Registration failed";
        }
      } else {
        apiError.value =
          "Connection failed — check your internet connection and try again";
      }
      return false;
    } finally {
      isSubmitting.value = false;
    }
  };

  return { form, errors, apiError, isSubmitting, validate, submit };
};
