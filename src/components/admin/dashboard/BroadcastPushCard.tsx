'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Send, Loader2, Globe } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';

function getErrorMessage(error: unknown, fallback: string) {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = error as { response?: { data?: { message?: string } } };
        return response.response?.data?.message || fallback;
    }
    return error instanceof Error ? error.message || fallback : fallback;
}

export function BroadcastPushCard() {
    const { organization } = useOrg();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [roleTarget, setRoleTarget] = useState('driver');
    const [url, setUrl] = useState('/');
    const [image, setImage] = useState('');
    const [icon, setIcon] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (!title || !body) {
            toast.error('Title and Message are required');
            return;
        }

        try {
            setIsSending(true);
            await apiClient.broadcastPush({
                roleTarget,
                title,
                body,
                url,
                image: image || undefined,
                icon: icon || undefined
            });

            toast.success(`Announcement sent to all ${roleTarget}s!`);
            setTitle('');
            setBody('');
            setUrl('/');
            setImage('');
            setIcon('');
        } catch (error: unknown) {
            console.error('[Broadcast] Failed:', error);
            toast.error(getErrorMessage(error, 'Failed to send broadcast'));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Card className="shadow-sm border-t-4 border-t-emerald-500 overflow-hidden relative">
            <div className="absolute right-0 top-0 p-4 opacity-5 pointer-events-none">
                <Globe className="h-24 w-24" />
            </div>

            <CardHeader>
                <div className="flex items-center gap-2">
                    <div className="bg-emerald-500/10 p-2 rounded-lg">
                        <Megaphone className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                        <CardTitle>Rich Marketing Broadcast</CardTitle>
                        <CardDescription>Target users with high-impact visual announcements.</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* LEFT COLUMN: Controls */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Audience</label>
                                <Select value={roleTarget} onValueChange={setRoleTarget}>
                                    <SelectTrigger className="bg-muted/30 border-none h-10">
                                        <SelectValue placeholder="Select target" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="driver">Drivers</SelectItem>
                                        <SelectItem value="customer">Customers</SelectItem>
                                        <SelectItem value="admin">Admins</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Action Link</label>
                                <Input
                                    placeholder="/dashboard"
                                    className="bg-muted/30 border-none h-10"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hero Image URL (Marketing)</label>
                            <Input
                                placeholder="https://example.com/promo-banner.jpg"
                                className="bg-muted/30 border-none h-10"
                                value={image}
                                onChange={(e) => setImage(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campaign Icon URL</label>
                            <Input
                                placeholder="https://example.com/custom-icon.png"
                                className="bg-muted/30 border-none h-10"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campaign Title</label>
                            <Input
                                placeholder="Catchy heading..."
                                className="bg-muted/30 border-none h-11 text-base font-medium"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campaign Message</label>
                            <Textarea
                                placeholder="Engage your users with a clear message..."
                                className="bg-muted/30 border-none min-h-25 resize-none text-sm"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Mobile Preview */}
                    <div className="flex flex-col items-center justify-center bg-muted/20 rounded-2xl p-6 border border-dashed border-muted-foreground/20">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Real-Time Mobile Preview</label>

                        <div className="w-70 bg-[#1a1a1a] rounded-3xl p-3 shadow-2xl border border-white/5 ring-4 ring-black">
                            {/* Notification Mockup */}
                            <div className="bg-[#2a2a2a]/90 backdrop-blur-md rounded-2xl p-4 shadow-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 w-5 rounded-md bg-white overflow-hidden">
                                            {icon ? <img src={icon} alt="icon" className="h-full w-full object-cover" /> : <div className="bg-emerald-500 h-full w-full" />}
                                        </div>
                                        <span className="text-[10px] font-medium text-white/40 uppercase tracking-tighter">{organization?.name || "Your Dealership"}</span>
                                    </div>
                                    <span className="text-[9px] text-white/30 tracking-tighter">NOW</span>
                                </div>
                                <h4 className="text-sm font-bold text-white truncate">{title || 'Campaign Title'}</h4>
                                <p className="text-xs text-white/70 line-clamp-2 mt-0.5 leading-snug">{body || 'The marketing message will appear here...'}</p>

                                {image && (
                                    <div className="mt-3 rounded-xl overflow-hidden aspect-video bg-black/40 border border-white/5">
                                        <img src={image} alt="hero" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="mt-4 text-[11px] text-muted-foreground/60 italic text-center px-4">
                            Previews may vary slightly by OS (Android/iOS).
                        </p>
                    </div>
                </div>

                <div className="pt-2">
                    <Button
                        onClick={handleSend}
                        disabled={isSending || !title || !body}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all rounded-xl"
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Send className="h-4 w-4 mr-2" />
                        )}
                        {isSending ? 'Launching Campaign...' : 'Blast Marketing Announcement'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
