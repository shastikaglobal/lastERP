import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

const SuccessfulConversions = () => {
  const { profile } = useAuth();
  const [conversions, setConversions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalConversions: 0,
    wonDeals: 0,
    lostDeals: 0,
    conversionPercentage: '0%',
    totalRevenue: '$0'
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const url = profile?.company_id ? `/api/leads/converted?company_id=${profile.company_id}` : `/api/leads/converted`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to load conversions');
      }

      const leads = await res.json();
      
      // Filter out deleted leads
      // The converted endpoint already returns only active, non-deleted leads
        const activeLeads = leads;
      
      // Won deals
      // The /converted endpoint already returns only converted leads
        const won = leads; // rename for clarity

      // Lost deals
      const lost = activeLeads.filter((lead: any) => 
        ["lost"].includes(lead.stage?.toLowerCase())
      );

      // Calculate stats
      const totalConversions = won.length;
      const wonDeals = won.length;
      const lostDeals = lost.length;
      
      const totalClosed = wonDeals + lostDeals;
      const conversionPercentage = activeLeads.length > 0 
        ? ((wonDeals / activeLeads.length) * 100).toFixed(1) + "%" 
        : "0%";

      // Sum of deal values if any lead has it, otherwise default to 0
      const totalRevAmount = won.reduce((sum: number, l: any) => sum + Number(l.deal_value || 0), 0);
      const totalRevenue = `$${totalRevAmount.toLocaleString()}`;

      setStats({
        totalConversions,
        wonDeals,
        lostDeals,
        conversionPercentage,
        totalRevenue
      });

      setConversions(won.map((conv: any) => ({
          id: conv.id,
          date: conv.acquisition_date || new Date().toISOString(),
          companyName: conv.client_name || 'Unknown',
          country: conv.country || 'Unknown',
          product: conv.product_interested || 'N/A',
          assignedBde: conv.assigned_bde || 'Unassigned',
          dealValue: conv.deal_value || 0,
          status: conv.status || 'Won',
          orderConfirmation: 'Confirmed',
          clientOnboarding: 'Completed'
        })));

    } catch (err: any) {
      console.error('Error fetching conversions:', err);
      toast.error(err.message || 'Unable to load conversions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.company_id]);

  const exportCSV = () => {
    if (conversions.length === 0) {
      toast.error("No conversions available to export.");
      return;
    }

    const headers = [
      "Conversion Date",
      "Company Name",
      "Country",
      "Product",
      "Assigned BDE",
      "Deal Value",
      "Status",
      "Order Confirmation Status",
      "Client Onboarding Status"
    ];

    const csvContent = [
      headers.join(","),
      ...conversions.map(c => [
        `"${format(new Date(c.date), "dd MMM yyyy")}"`,
        `"${c.companyName}"`,
        `"${c.country}"`,
        `"${c.product}"`,
        `"${c.assignedBde}"`,
        `"$${c.dealValue}"`,
        `"${c.status}"`,
        `"${c.orderConfirmation}"`,
        `"${c.clientOnboarding}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `conversions_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 gap-4">
        <div>
          <div className="text-sm text-gray-500 mb-1">CRM {'>'} Conversions</div>
          <h1 className="text-3xl font-bold text-white mb-2">Successful Conversions</h1>
          <p className="text-sm text-gray-400">Monitor leads that have been successfully converted into customers</p>
        </div>
        
        {/* Action Button */}
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg hover:bg-[#2a2a2a] hover:border-[#f5a623] hover:text-[#f5a623] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#f5a623]/50"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span className="font-medium">Export CSV</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Conversions', value: stats.totalConversions },
          { label: 'Won Deals', value: stats.wonDeals },
          { label: 'Lost Deals', value: stats.lostDeals },
          { label: 'Conversion Percentage', value: stats.conversionPercentage },
          { label: 'Total Revenue Generated', value: stats.totalRevenue },
        ].map((stat, idx) => (
          <div 
            key={idx} 
            className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 flex flex-col justify-center hover:border-[#f5a623]/40 transition-colors duration-300"
          >
            <span className="text-sm text-gray-400 mb-2 font-medium">{stat.label}</span>
            <span className="text-3xl font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-[#1e1e1e] border-b border-[#2a2a2a]">
                <th className="py-4 px-6 font-semibold text-white text-sm whitespace-nowrap">Conversion Date</th>
                <th className="py-4 px-6 font-semibold text-white text-sm whitespace-nowrap">Company Name</th>
                <th className="py-4 px-6 font-semibold text-white text-sm whitespace-nowrap">Country</th>
                <th className="py-4 px-6 font-semibold text-white text-sm whitespace-nowrap">Product</th>
                <th className="py-4 px-6 font-semibold text-white text-sm whitespace-nowrap">Assigned BDE</th>
                <th className="py-4 px-6 font-semibold text-white text-sm whitespace-nowrap">Deal Value</th>
                <th className="py-4 px-6 font-semibold text-white text-sm whitespace-nowrap">Won/Lost Status</th>
                <th className="py-4 px-6 font-semibold text-white text-sm whitespace-nowrap">Order Confirmation Status</th>
                <th className="py-4 px-6 font-semibold text-white text-sm whitespace-nowrap">Client Onboarding Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                    Loading conversions...
                  </td>
                </tr>
              ) : conversions.length > 0 ? (
                conversions.map((conv, idx) => (
                  <tr key={conv.id || idx} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-4 px-6 text-gray-300 text-sm whitespace-nowrap">
                      {format(new Date(conv.date), "dd MMM yyyy")}
                    </td>
                    <td className="py-4 px-6 font-bold text-white text-sm whitespace-nowrap">
                      {conv.companyName}
                    </td>
                    <td className="py-4 px-6 text-gray-300 text-sm whitespace-nowrap">
                      {conv.country}
                    </td>
                    <td className="py-4 px-6 text-gray-300 text-sm whitespace-nowrap">
                      {conv.product}
                    </td>
                    <td className="py-4 px-6 text-gray-300 text-sm whitespace-nowrap">
                      {conv.assignedBde}
                    </td>
                    <td className="py-4 px-6 text-emerald-500 font-bold text-sm whitespace-nowrap">
                      ${conv.dealValue.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-sm whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {conv.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {conv.orderConfirmation}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                        {conv.clientOnboarding}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                /* Empty State */
                <tr>
                  <td colSpan={9} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#2a2a2a] mb-4 shadow-inner">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="32" 
                          height="32" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className="text-[#f5a623] opacity-90"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </div>
                      <p className="text-[#9ca3af] text-sm font-medium">No successful conversions yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuccessfulConversions;
