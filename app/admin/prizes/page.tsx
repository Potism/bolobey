import AdminPrizesDashboard from "@/components/admin-prizes-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminPrizesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🏆 Prizes Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage prizes, redemptions, and view analytics
        </p>
      </div>

      <AdminPrizesDashboard />
    </div>
  );
}
