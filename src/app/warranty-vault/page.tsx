import PremiumGate from "@/components/PremiumGate";
import WarrantyVaultApp from "@/components/WarrantyVaultApp";

export default function WarrantyVault() {
  return (
    <PremiumGate feature="Warranty Vault">
      <WarrantyVaultApp />
    </PremiumGate>
  );
}
