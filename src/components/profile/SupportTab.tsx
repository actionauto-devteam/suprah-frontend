import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    HelpCircle,
    MessageSquare,
    Mail,
    Building2,
    Phone,
    MapPin,
    Clock,
    FileText
} from 'lucide-react';

export const SupportTab: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-0 shadow-lg border border-gray-200/80 dark:border-gray-800 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <HelpCircle className="size-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Help & Support</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">We&apos;re here to help you</p>
                    </div>
                </div>
                <CardContent className="space-y-3 p-5">
                    <div className="relative">
                        <Button variant="outline" className="w-full justify-start opacity-60 pr-24 truncate" disabled>
                            <MessageSquare className="size-4 mr-3 shrink-0" /><span className="truncate">Live Chat Support</span>
                        </Button>
                        <Badge className="absolute top-1/2 right-3 -translate-y-1/2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] shrink-0">Coming Soon</Badge>
                    </div>
                    <div className="relative">
                        <Button variant="outline" className="w-full justify-start opacity-60 pr-24 truncate" disabled>
                            <FileText className="size-4 mr-3 shrink-0" /><span className="truncate">Knowledge Base & Guides</span>
                        </Button>
                        <Badge className="absolute top-1/2 right-3 -translate-y-1/2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] shrink-0">Coming Soon</Badge>
                    </div>
                    <Button
                        variant="outline"
                        className="w-full justify-start truncate"
                        onClick={() => window.open('https://mail.google.com/mail/?view=cm&to=support@actionautoutah.com&su=Support%20Request', '_blank')}
                    >
                        <Mail className="size-4 mr-3 shrink-0" /><span className="truncate">Email: support@actionautoutah.com</span>
                    </Button>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Clock className="size-3.5 text-cyan-600 dark:text-cyan-400" />
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Response Times</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Emails are typically responded to within 24 hours during business days (Mon–Fri, 9 AM – 5 PM MST).
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="p-0 shadow-lg border border-gray-200/80 dark:border-gray-800 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Building2 className="size-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">About ActionAutoUtah</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Company overview</p>
                    </div>
                </div>
                <CardContent className="space-y-3 p-5">
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        ActionAutoUtah is your trusted partner for vehicle transport and logistics solutions, serving dealerships and customers across Utah and beyond.
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            <MapPin className="size-4 text-blue-500 shrink-0" />
                            <div>
                                <p className="text-[9px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Location</p>
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Salt Lake City, Utah</p>
                            </div>
                        </div>
                        <a
                            href="tel:+18554316570"
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Call support at (855) 431-6570"
                        >
                            <Phone className="size-4 text-emerald-500 shrink-0" />
                            <div>
                                <p className="text-[9px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Contact</p>
                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">(855) 431-6570</p>
                            </div>
                        </a>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            <p className="text-[9px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Version</p>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">1.0.0</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            <p className="text-[9px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500">Last Updated</p>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Feb 2026</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
