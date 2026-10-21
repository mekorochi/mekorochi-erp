"use client";

import { useActionState, useState } from "react";
import { setupAction, type ActionResult } from "../actions";

const STEPS = [
  { label: "Account", num: 1 },
  { label: "Company", num: 2 },
  { label: "Config", num: 3 },
];

const MONTHS = [
  { value: 1, label: "January" }, { value: 2, label: "February" },
  { value: 3, label: "March" }, { value: 4, label: "April" },
  { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" },
  { value: 9, label: "September" }, { value: 10, label: "October" },
  { value: 11, label: "November" }, { value: 12, label: "December" },
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const initialState: ActionResult = {};

export function SetupWizard() {
  const [step, setStep] = useState(1);
  const [state, formAction, pending] = useActionState(setupAction, initialState);

  const inputClass =
    "w-full h-11 px-3 rounded-lg border border-[var(--input)] bg-[var(--background)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-shadow";
  const selectClass = inputClass + " appearance-none";
  const labelClass = "block text-sm font-medium text-[var(--foreground)] mb-1.5";

  function fieldError(field: string): string | undefined {
    return state.fieldErrors?.[field]?.[0];
  }

  return (
    <form action={formAction}>
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {STEPS.map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { if (s.num < step) setStep(s.num); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                s.num === step
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : s.num < step
                    ? "bg-[var(--secondary)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              }`}
            >
              {s.num < step ? "✓" : s.num}
            </button>
            {s.num < STEPS.length && (
              <div
                className={`w-8 h-0.5 ${
                  s.num < step ? "bg-[var(--secondary)]" : "bg-[var(--muted)]"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-4">
        <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
          Step {step} of 3 — {STEPS[step - 1].label}
        </span>
      </div>

      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
          {state.error}
        </div>
      )}

      {/* Step 1: Account */}
      <div className={step === 1 ? "space-y-4" : "hidden"}>
        <div>
          <label htmlFor="name" className={labelClass}>Full Name</label>
          <input id="name" name="name" type="text" required className={inputClass} placeholder="Your name" />
          {fieldError("name") && <p className="mt-1 text-xs text-red-600">{fieldError("name")}</p>}
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Email Address</label>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} placeholder="you@company.com" />
          {fieldError("email") && <p className="mt-1 text-xs text-red-600">{fieldError("email")}</p>}
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Password</label>
          <input id="password" name="password" type="password" required minLength={8} className={inputClass} placeholder="Minimum 8 characters" />
          {fieldError("password") && <p className="mt-1 text-xs text-red-600">{fieldError("password")}</p>}
        </div>
        <div>
          <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required className={inputClass} placeholder="Re-enter your password" />
          {fieldError("confirmPassword") && <p className="mt-1 text-xs text-red-600">{fieldError("confirmPassword")}</p>}
        </div>
        <button
          type="button"
          onClick={() => setStep(2)}
          className="w-full h-11 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Continue
        </button>
      </div>

      {/* Step 2: Company */}
      <div className={step === 2 ? "space-y-4" : "hidden"}>
        <div>
          <label htmlFor="companyName" className={labelClass}>Company / Brand Name</label>
          <input id="companyName" name="companyName" type="text" defaultValue="MEKOROCHI" required className={inputClass} />
          {fieldError("companyName") && <p className="mt-1 text-xs text-red-600">{fieldError("companyName")}</p>}
        </div>
        <div>
          <label htmlFor="legalName" className={labelClass}>Legal Entity Name <span className="text-[var(--muted-foreground)] font-normal">(optional)</span></label>
          <input id="legalName" name="legalName" type="text" className={inputClass} placeholder="e.g. Jay Veer Alliance Pvt Ltd" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="city" className={labelClass}>City</label>
            <input id="city" name="city" type="text" className={inputClass} placeholder="Ahmedabad" />
          </div>
          <div>
            <label htmlFor="state" className={labelClass}>State</label>
            <select id="state" name="state" className={selectClass} defaultValue="">
              <option value="">Select…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="phone" className={labelClass}>Phone</label>
            <input id="phone" name="phone" type="tel" className={inputClass} placeholder="+91 …" />
          </div>
          <div>
            <label htmlFor="companyEmail" className={labelClass}>Company Email</label>
            <input id="companyEmail" name="companyEmail" type="email" className={inputClass} placeholder="info@…" />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 h-11 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium text-sm hover:bg-[var(--muted)] transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="flex-1 h-11 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </div>
      </div>

      {/* Step 3: Configuration */}
      <div className={step === 3 ? "space-y-4" : "hidden"}>
        <div>
          <label htmlFor="financialYearStart" className={labelClass}>Financial Year Starts</label>
          <select id="financialYearStart" name="financialYearStart" className={selectClass} defaultValue="4">
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">April is standard for India</p>
        </div>
        <div>
          <label htmlFor="currency" className={labelClass}>Currency</label>
          <select id="currency" name="currency" className={selectClass} defaultValue="INR">
            <option value="INR">INR — Indian Rupee (₹)</option>
            <option value="USD">USD — US Dollar ($)</option>
            <option value="EUR">EUR — Euro (€)</option>
            <option value="GBP">GBP — British Pound (£)</option>
          </select>
        </div>
        <div>
          <label htmlFor="timezone" className={labelClass}>Time Zone</label>
          <select id="timezone" name="timezone" className={selectClass} defaultValue="Asia/Kolkata">
            <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex-1 h-11 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium text-sm hover:bg-[var(--muted)] transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 h-11 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {pending ? "Setting up…" : "Complete Setup"}
          </button>
        </div>
      </div>
    </form>
  );
}
