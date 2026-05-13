import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    UserCog,
    Edit3,
    Check,
    Phone,
    MapPin,
    Calendar,
    User,
    Briefcase,
    Building2,
    Globe,
    Link2,
    Plus,
    X,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { PersonalInfo, SocialLink } from '@/types/user';
import { cn } from '@/lib/utils';
import { languageOptions } from './profile-constants';
import { DEPARTMENTS } from '@/lib/departments';

interface PersonalInfoTabProps {
    personalInfo: PersonalInfo;
    editingPersonalInfo: boolean;
    isSaving: boolean;
    phoneCountryCode: string;
    socialLinks: SocialLink[];
    bioError: string;
    setEditingPersonalInfo: (editing: boolean) => void;
    setPersonalInfo: (info: PersonalInfo) => void;
    setPhoneCountryCode: (code: string) => void;
    setSocialLinks: (links: SocialLink[]) => void;
    handleBioChange: (value: string) => void;
    setShowSaveConfirmDialog: (show: boolean) => void;
    addSocialLink: () => void;
    updateSocialLink: (index: number, field: 'label' | 'url', value: string) => void;
    removeSocialLink: (index: number) => void;
}

const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const isValidUrl = (url: string) => {
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch { return false; }
};

const linkLabelExamples = ['LinkedIn', 'Portfolio', 'GitHub', 'Instagram', 'Twitter / X', 'YouTube', 'Personal Blog', 'Company Site'];

export const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({
    personalInfo,
    editingPersonalInfo,
    isSaving,
    phoneCountryCode,
    socialLinks,
    bioError,
    setEditingPersonalInfo,
    setPersonalInfo,
    setPhoneCountryCode,
    setSocialLinks,
    handleBioChange,
    setShowSaveConfirmDialog,
    addSocialLink,
    updateSocialLink,
    removeSocialLink,
}) => {
    // ── Department "Other" state ──────────────────────────────────────────────
    // `deptMode`  — what the Select displays (a dept key, '__other__', or '__none__')
    // `customDeptText` — free-text when mode is '__other__'
    //
    // We cannot derive deptMode from personalInfo.department on every render because
    // handleDeptSelect sets department = undefined when user first picks "Other"
    // (no text yet), which would immediately flip the Select back to "Not set".
    // Instead we own the display state here and sync from props only while NOT editing.

    const [deptMode, setDeptMode] = React.useState<string>('__none__');
    const [customDeptText, setCustomDeptText] = React.useState<string>('');

    // Sync from props when the profile loads OR when editing is cancelled/saved.
    // Guard skips the sync while the user is actively editing so their in-progress
    // changes aren't overwritten by the parent's personalInfo updates.
    React.useEffect(() => {
        if (editingPersonalInfo) return;
        const dept = personalInfo.department;
        if (!dept) {
            setDeptMode('__none__');
            setCustomDeptText('');
        } else if (DEPARTMENTS.some((d) => d.key === dept)) {
            setDeptMode(dept);
            setCustomDeptText('');
        } else {
            setDeptMode('__other__');
            setCustomDeptText(dept);
        }
    }, [personalInfo.department, editingPersonalInfo]);

    function handleDeptSelect(value: string) {
        setDeptMode(value);
        if (value === '__none__') {
            setPersonalInfo({ ...personalInfo, department: undefined });
        } else if (value === '__other__') {
            // Leave department as whatever is in customDeptText (may be empty for now —
            // the input below lets the user fill it in)
            setPersonalInfo({ ...personalInfo, department: customDeptText || undefined });
        } else {
            setPersonalInfo({ ...personalInfo, department: value });
        }
    }

    function handleCustomDeptText(text: string) {
        setCustomDeptText(text);
        setPersonalInfo({ ...personalInfo, department: text || undefined });
    }

    return (
        <Card className="p-0 shadow-lg border border-gray-200/80 dark:border-gray-800 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        <UserCog className="size-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Personal Information</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Manage your personal details</p>
                    </div>
                </div>
                {!editingPersonalInfo ? (
                    <Button onClick={() => setEditingPersonalInfo(true)} size="sm">
                        <Edit3 className="size-4 mr-2" />Edit
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingPersonalInfo(false)}>Cancel</Button>
                        <Button size="sm" onClick={() => setShowSaveConfirmDialog(true)} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                            {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
                            Save
                        </Button>
                    </div>
                )}
            </div>
            <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    <div className="md:col-span-2 space-y-3">
                        <Label htmlFor="bio" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
                            <Edit3 className="size-4 text-emerald-600 dark:text-emerald-400" />Bio / Description
                        </Label>
                        <Textarea
                            id="bio"
                            value={personalInfo.bio || ''}
                            onChange={(e) => handleBioChange(e.target.value)}
                            disabled={!editingPersonalInfo}
                            placeholder="Tell us about yourself..."
                            className="min-h-30 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors duration-200 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 disabled:bg-gray-50 dark:disabled:bg-gray-900 font-medium resize-none"
                            maxLength={500}
                        />
                        <div className="flex justify-between items-center">
                            <span className={cn("text-xs font-medium transition-colors", bioError ? "text-red-500" : "text-gray-500")}>
                                {bioError || `${(personalInfo.bio?.length || 0)}/500 characters`}
                            </span>
                            {(personalInfo.bio?.length || 0) > 450 && (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold animate-soft-pulse">{500 - (personalInfo.bio?.length || 0)} remaining</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="phone" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
                            <Phone className="size-4 text-emerald-600 dark:text-emerald-400" />Phone Number
                        </Label>
                        <div className="flex gap-2">
                            <div className="flex items-center justify-center w-16 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-semibold text-gray-600 dark:text-gray-400 select-none shrink-0">
                                +1
                            </div>
                            <Input
                                id="phone"
                                value={formatPhone(personalInfo.phone || '')}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setPersonalInfo({ ...personalInfo, phone: digits });
                                }}
                                disabled={!editingPersonalInfo}
                                placeholder="(555) 123-4567"
                                maxLength={14}
                                className="flex-1 rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 disabled:bg-gray-50 dark:disabled:bg-gray-900 font-medium p-3"
                            />
                        </div>
                        {personalInfo.phone && personalInfo.phone.replace(/\D/g, '').length > 0 && personalInfo.phone.replace(/\D/g, '').length < 10 && editingPersonalInfo && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle className="size-3" /> Enter a valid 10-digit US number
                            </p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="location" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
                            <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />Location
                        </Label>
                        <Input id="location" value={personalInfo.location || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, location: e.target.value })} disabled={!editingPersonalInfo} placeholder="City, State"
                            className="rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 disabled:bg-gray-50 dark:disabled:bg-gray-900 font-medium p-3"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="dateOfBirth" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
                            <Calendar className="size-4 text-emerald-600 dark:text-emerald-400" />Date of Birth
                        </Label>
                        <Input
                            id="dateOfBirth"
                            type="date"
                            value={personalInfo.dateOfBirth || ''}
                            onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                            disabled={!editingPersonalInfo}
                            className="rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 disabled:bg-gray-50 dark:disabled:bg-gray-900 font-medium p-3"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="gender" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
                            <User className="size-4 text-emerald-600 dark:text-emerald-400" />Gender
                        </Label>
                        <Select value={personalInfo.gender || ''} onValueChange={(value) => setPersonalInfo({ ...personalInfo, gender: value })} disabled={!editingPersonalInfo}>
                            <SelectTrigger className="rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors hover:border-gray-300"><SelectValue placeholder="Select gender" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="jobTitle" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
                            <Briefcase className="size-4 text-emerald-600 dark:text-emerald-400" />Job Title
                        </Label>
                        <Input id="jobTitle" value={personalInfo.jobTitle || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, jobTitle: e.target.value })} disabled={!editingPersonalInfo} placeholder="Sales Manager"
                            className="rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 disabled:bg-gray-50 dark:disabled:bg-gray-900 font-medium p-3"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="department" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
                            <Building2 className="size-4 text-emerald-600 dark:text-emerald-400" />Department
                        </Label>
                        <Select
                            value={deptMode}
                            onValueChange={handleDeptSelect}
                            disabled={!editingPersonalInfo}
                        >
                            <SelectTrigger className="rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors disabled:bg-gray-50 dark:disabled:bg-gray-900 font-medium h-12">
                                <SelectValue placeholder="Select your department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">— Not set —</SelectItem>
                                {DEPARTMENTS.map((d) => (
                                    <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                                ))}
                                <SelectItem value="__other__">Other</SelectItem>
                            </SelectContent>
                        </Select>

                        {deptMode === '__other__' && (
                            <Input
                                value={customDeptText}
                                onChange={(e) => handleCustomDeptText(e.target.value)}
                                disabled={!editingPersonalInfo}
                                placeholder="Please specify your department…"
                                maxLength={100}
                                className="rounded-lg border-2 border-amber-300 dark:border-amber-700 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors disabled:bg-gray-50 dark:disabled:bg-gray-900 font-medium p-3"
                            />
                        )}
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="language" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
                            <Globe className="size-4 text-emerald-600 dark:text-emerald-400" />Language
                        </Label>
                        <Select value={personalInfo.language || ''} onValueChange={(value) => setPersonalInfo({ ...personalInfo, language: value })} disabled={!editingPersonalInfo}>
                            <SelectTrigger className="rounded-lg border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors hover:border-gray-300"><SelectValue placeholder="Select language" /></SelectTrigger>
                            <SelectContent>
                                {languageOptions.map((lang) => (
                                    <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Social Links Section */}
                    <div className="md:col-span-2 space-y-4 pt-5 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
                                <Link2 className="size-4 text-emerald-600 dark:text-emerald-400" />Additional Links ({socialLinks.length}/4)
                            </Label>
                            {editingPersonalInfo && socialLinks.length < 4 && (
                                <Button type="button" variant="outline" size="sm" onClick={addSocialLink} className="">
                                    <Plus className="mr-1 size-3" /> Add Link
                                </Button>
                            )}
                        </div>
                        {socialLinks.length === 0 ? (
                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">No additional links added. Click "Add Link" to add up to 4 links.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {socialLinks.map((link, index) => {
                                    const placeholderLabel = linkLabelExamples[index % linkLabelExamples.length];
                                    const urlError = link.url && !isValidUrl(link.url);
                                    const labelTooLong = link.label.length > 30;
                                    return (
                                        <div key={index} className="flex gap-2 items-start" style={{ animationDelay: `${index * 0.1}s` }}>
                                            <div className="flex-1 space-y-2">
                                                <Input
                                                    value={link.label}
                                                    onChange={(e) => updateSocialLink(index, 'label', e.target.value.slice(0, 30))}
                                                    disabled={!editingPersonalInfo}
                                                    placeholder={`e.g. ${placeholderLabel}`}
                                                    maxLength={30}
                                                    className={cn(
                                                        "text-sm rounded-lg border-2 transition-colors focus:ring-4 disabled:bg-gray-50 dark:disabled:bg-gray-900 p-3",
                                                        labelTooLong ? "border-amber-400 focus:border-amber-500" : "border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-100 dark:focus:ring-emerald-900/30"
                                                    )}
                                                />
                                                <Input
                                                    value={link.url}
                                                    onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                                                    disabled={!editingPersonalInfo}
                                                    placeholder="https://example.com"
                                                    className={cn(
                                                        "text-sm rounded-lg border-2 transition-colors focus:ring-4 disabled:bg-gray-50 dark:disabled:bg-gray-900 p-3",
                                                        urlError ? "border-red-400 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/30" : "border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-100 dark:focus:ring-emerald-900/30"
                                                    )}
                                                />
                                                {urlError && editingPersonalInfo && (
                                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                                        <AlertCircle className="size-3" /> Enter a valid URL starting with https://
                                                    </p>
                                                )}
                                            </div>
                                            {editingPersonalInfo && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeSocialLink(index)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                >
                                                    <X className="size-4" />
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
