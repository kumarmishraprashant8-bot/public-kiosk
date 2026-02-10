import { motion } from 'framer-motion';

interface TrustTimelineProps {
    status: 'submitted' | 'verified' | 'assigned' | 'dispatched' | 'resolved';
}

const STEPS = [
    { id: 'submitted', label: 'Report Submitted', icon: '📝' },
    { id: 'verified', label: 'AI Verified', icon: '🤖' },
    { id: 'assigned', label: 'Dept Assigned', icon: '🏢' },
    { id: 'dispatched', label: 'Crew Dispatched', icon: '🚚' },
    { id: 'resolved', label: 'Resolved', icon: '✅' }
];

export default function TrustTimeline({ status }: TrustTimelineProps) {
    const currentStepIndex = STEPS.findIndex(s => s.id === status);

    return (
        <div className="w-full py-8">
            <div className="relative flex justify-between items-center max-w-3xl mx-auto">
                {/* Progress Bar Background */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-700 -z-10 rounded-full" />

                {/* Active Progress Bar */}
                <motion.div
                    className="absolute top-1/2 left-0 h-1 bg-green-500 -z-10 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                />

                {STEPS.map((step, index) => {
                    const isActive = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: isActive ? 1 : 0.8, opacity: 1 }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-4 transition-colors z-10 ${isActive
                                        ? 'bg-green-500 border-green-300 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                                        : 'bg-gray-800 border-gray-600 text-gray-500'
                                    } ${isCurrent ? 'animate-pulse' : ''}`}
                            >
                                {step.icon}
                            </motion.div>
                            <span className={`text-xs font-medium ${isActive ? 'text-green-400' : 'text-gray-500'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
