import JobFilesApp from "@/components/JobFilesApp";
import PremiumGate from "@/components/PremiumGate";

export default function JobFiles() {
  return (
    <PremiumGate feature="Job Files">
      <JobFilesApp />
    </PremiumGate>
  );
}
