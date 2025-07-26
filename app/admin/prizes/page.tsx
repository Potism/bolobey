import AdminPrizesDashboard from "@/components/admin-prizes-dashboard";
import { AdminPrizesShipping } from "@/components/admin-prizes-shipping";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Truck } from "lucide-react";

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
          Manage prizes, redemptions, shipping, and view analytics
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Prizes Dashboard
          </TabsTrigger>
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Shipping Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <AdminPrizesDashboard />
        </TabsContent>

        <TabsContent value="shipping" className="mt-6">
          <AdminPrizesShipping />
        </TabsContent>
      </Tabs>
    </div>
  );
}
