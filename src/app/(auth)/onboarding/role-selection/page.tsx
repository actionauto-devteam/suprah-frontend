"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthActions, useUser } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { UserCheck, Briefcase, Loader2, ArrowRight, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OnboardingPage() {
  const { refreshUser } = useAuthActions();
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [step, setStep] = useState<'role' | 'org'>('role');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<{ _id: string; name: string; logoUrl?: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgsLoading, setOrgsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && user?.onboardingCompleted) router.push('/');
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (step !== 'org') return;
    setOrgsLoading(true);
    apiClient.getPublicOrganizations()                        // ← was: apiClient.get('/organizations/public')
      .then(r => setOrgs(r.data.data ?? []))
      .catch(() => toast.error('Could not load dealerships'))
      .finally(() => setOrgsLoading(false));
  }, [step]);

  if (!isLoaded || user?.onboardingCompleted) return null;

  const handleRoleSelection = async (role: string) => {
    setIsLoading(true);
    setSelectedRole(role);
    try {
      const res = await apiClient.completeOnboarding(role);   // ← was: apiClient.post('/auth/complete-onboarding', { role })
      if (res.data?.data?.skipOrgSelect) {
        toast.success('Account setup complete!');
        await refreshUser();
      } else {
        setStep('org');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to set role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrgSelection = async () => {
    if (!selectedOrgId) return;
    setIsLoading(true);
    try {
      await apiClient.selectOnboardingOrg(selectedOrgId);     // ← was: apiClient.post('/auth/select-onboarding-org', { organizationId: selectedOrgId })
      toast.success('Welcome! Your account is ready.');
      await refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join dealership');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_50%)]">
      <div className="w-full max-w-2xl space-y-8">

        <div className="space-y-4 text-center">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium"
          >
            {step === 'role' ? 'Step 1 of 2 — Your role' : 'Step 2 of 2 — Your dealership'}
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            {step === 'role' ? 'Complete Your Account' : 'Select Your Dealership'}
          </h1>
          <p className="text-zinc-500 text-lg font-light">
            {step === 'role'
              ? 'Please select how you want to use the platform.'
              : 'Choose the dealership you purchased your vehicle from.'}
          </p>
        </div>

        {step === 'role' && (
          <motion.div
            key="role-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 gap-4"
          >
            <IdentityCard
              icon={<UserCheck className="h-6 w-6" />}
              title="I am a Customer"
              description="I want to browse vehicles and manage my appointments."
              onClick={() => handleRoleSelection('customer')}
              isLoading={isLoading && selectedRole === 'customer'}
              disabled={isLoading}
            />
            <IdentityCard
              icon={<Briefcase className="h-6 w-6" />}
              title="I am a Dealer"
              description="I want to manage my dealership and inventory."
              onClick={() => handleRoleSelection('dealership')}
              isLoading={isLoading && selectedRole === 'dealership'}
              disabled={isLoading}
            />
          </motion.div>
        )}

        {step === 'org' && (
          <motion.div
            key="org-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {orgsLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : orgs.length === 0 ? (
              <p className="text-center text-zinc-500">No dealerships found. Please contact support.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-1">
                {orgs.map(org => (
                  <button
                    key={org._id}
                    onClick={() => setSelectedOrgId(org._id)}
                    className={`group flex items-center gap-4 p-5 text-left rounded-2xl border transition-all active:scale-[0.98]
                      ${selectedOrgId === org._id
                        ? 'border-emerald-500/60 bg-emerald-500/[0.06]'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}
                  >
                    {org.logoUrl ? (
                      <img src={org.logoUrl} alt={org.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-zinc-500" />
                      </div>
                    )}
                    <span className={`font-semibold text-base transition-colors ${selectedOrgId === org._id ? 'text-emerald-400' : 'text-white'}`}>
                      {org.name}
                    </span>
                    {selectedOrgId === org._id && (
                      <span className="ml-auto text-emerald-500">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleOrgSelection}
              disabled={!selectedOrgId || isLoading}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </button>

            <button
              onClick={() => setStep('role')}
              className="w-full text-center text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
            >
              ← Back
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function IdentityCard({ icon, title, description, onClick, isLoading, disabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative flex items-center gap-6 p-6 text-left bg-white/[0.02] border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] transition-all rounded-[1.5rem] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden active:scale-[0.98]"
    >
      <div className="h-12 w-12 rounded-xl bg-white/[0.05] group-hover:bg-emerald-500/10 flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 transition-colors shrink-0">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      </div>
      <div>
        <h3 className="text-white font-bold text-lg group-hover:text-emerald-400 transition-colors">{title}</h3>
        <p className="text-zinc-500 text-sm font-light leading-relaxed group-hover:text-zinc-400 transition-colors">{description}</p>
      </div>
      <ArrowRight className="absolute right-6 h-5 w-5 text-zinc-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
    </button>
  );
}