import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit2, Plus } from 'lucide-react';

const ClientSuccess = () => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    country: '',
    email: '',
    phone: '',
    relationship_status: 'Active Client',
    satisfaction_notes: '',
    satisfaction_score: 0,
    repeat_order_count: 0
  });

  const fetchCustomers = async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/customers?company_id=${profile.company_id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to load customers');
      }

      const customers = await res.json();
      setClients(customers.map((customer: any) => ({
        id: customer.id,
        name: customer.name || 'Unknown customer',
        category: customer.relationship_status || 'CLIENT',
        health: 'HEALTHY',
        orders: customer.repeat_order_count || 0,
        score: customer.satisfaction_score || 0,
        satisfaction_notes: customer.satisfaction_notes || null,
        feedback: customer.satisfaction_notes || customer.feedback || '',
        country: customer.country || '',
        email: customer.email || '',
        phone: customer.phone || '',
        relationship_status: customer.relationship_status || 'Active Client',
        repeat_order_count: customer.repeat_order_count || 0,
        satisfaction_score: customer.satisfaction_score || 0
      })));
    } catch (err: any) {
      console.error('Error loading customers:', err);
      toast.error(err.message || 'Unable to load client feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [profile?.company_id]);

  const openFeedbackDialog = (client) => {
    setIsAddMode(false);
    setSelectedClient(client);
    setFeedbackText(client.satisfaction_notes || client.feedback || '');
    setIsFeedbackDialogOpen(true);
  };

  const openAddFeedbackDialog = () => {
    setIsAddMode(true);
    setSelectedClient(clients[0] || null);
    setFeedbackText('');
    setIsFeedbackDialogOpen(true);
  };

  const openEditDialog = (client) => {
    setSelectedClient(client);
    setEditForm({
      name: client.name || '',
      country: client.country || '',
      email: client.email || '',
      phone: client.phone || '',
      relationship_status: client.relationship_status || 'Active Client',
      satisfaction_notes: client.satisfaction_notes || '',
      satisfaction_score: client.satisfaction_score || 0,
      repeat_order_count: client.repeat_order_count || 0
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/customers/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          name: editForm.name,
          country: editForm.country,
          email: editForm.email,
          phone: editForm.phone,
          relationship_status: editForm.relationship_status,
          satisfaction_notes: editForm.satisfaction_notes,
          satisfaction_score: editForm.satisfaction_score,
          repeat_order_count: editForm.repeat_order_count
        })
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Update failed');
      }
      const updated = await res.json();
      setClients((current) =>
        current.map((client) =>
          client.id === selectedClient.id
            ? { ...client, ...updated, feedback: updated.satisfaction_notes || editForm.satisfaction_notes }
            : client
        )
      );
      toast.success('Customer updated successfully');
      setIsEditDialogOpen(false);
    } catch (err: any) {
      console.error('Edit save failed', err);
      toast.error(err.message || 'Failed to update customer');
    }
  };

  const handleFeedbackSave = async (event) => {
    event.preventDefault();
    if (!selectedClient) return;

    setIsSavingFeedback(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/customers/${selectedClient.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ satisfaction_notes: feedbackText })
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(errorBody || 'Failed to save feedback');
      }

      const updated = await res.json();
      setClients((current) =>
        current.map((client) =>
          client.id === selectedClient.id
            ? { ...client, satisfaction_notes: updated.satisfaction_notes, feedback: updated.satisfaction_notes || feedbackText }
            : client,
        ),
      );

      toast.success('Feedback updated successfully');
      setIsFeedbackDialogOpen(false);
    } catch (err: any) {
      console.error('Error saving feedback:', err);
      toast.error(err.message || 'Could not save feedback');
    } finally {
      setIsSavingFeedback(false);
    }
  };

  // Helper for Category Badges
  const getCategoryBadge = (category) => {
    switch (category) {
      case 'ACTIVE CLIENT':
      case 'Active Client':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'REPEAT BUYER':
      case 'Repeat Buyer':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'HIGH VALUE CLIENT':
      case 'High Value Client':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'POTENTIAL GROWTH CLIENT':
      case 'Potential Growth Client':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'INACTIVE CLIENT':
      case 'Inactive Client':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  // Helper for Health Badges
  const getHealthBadge = (health) => {
    switch (health) {
      case 'HEALTHY':
        return 'bg-green-500/20 text-green-500';
      case 'AT RISK':
        return 'bg-amber-500/20 text-amber-500';
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Helper for Avatar colors
  const getAvatarColor = (name) => {
    const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600', 'bg-rose-600'];
    const index = name.length % colors.length;
    return colors[index];
  };

  // Filter clients based on search term
  const filteredClients = clients.filter((client) => {
    const term = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(term) ||
      client.category.toLowerCase().includes(term) ||
      client.relationship_status.toLowerCase().includes(term) ||
      client.country.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 font-sans">
      {/* Header Section */}
      <div className="mb-8">
        <div className="text-sm text-gray-500 mb-1">CRM {'>'} Client Success</div>
        <h1 className="text-3xl font-bold text-white mb-2">Client Success Management</h1>
        <p className="text-sm text-gray-400">Track long-term relationships, satisfaction, and repeat business health</p>
      </div>

      {/* Toolbar Row */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-[60%]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            type="text"
            className="w-full bg-[#161616] border border-[#2a2a2a] text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#f5b400] focus:ring-1 focus:ring-[#f5b400] transition-colors placeholder-gray-500 text-sm"
            placeholder="Search by company name, category, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Right Side Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#161616] border border-[#2a2a2a] text-white rounded-lg hover:bg-[#222222] transition-colors focus:outline-none text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>

          <Button
            type="button"
            onClick={openAddFeedbackDialog}
            disabled={clients.length === 0}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f5b400] hover:bg-[#dca100] text-black rounded-lg transition-colors focus:outline-none text-sm font-semibold shadow-[0_0_15px_rgba(245,180,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Feedback
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-[#1e1e1e] border-b border-[#2a2a2a]">
                <th className="py-4 px-6 font-semibold text-gray-300 text-xs tracking-wider uppercase whitespace-nowrap">Customer Name</th>
                <th className="py-4 px-6 font-semibold text-gray-300 text-xs tracking-wider uppercase whitespace-nowrap">Category</th>
                <th className="py-4 px-6 font-semibold text-gray-300 text-xs tracking-wider uppercase whitespace-nowrap">Relationship Health</th>
                <th className="py-4 px-6 font-semibold text-gray-300 text-xs tracking-wider uppercase whitespace-nowrap">Repeat Orders</th>
                <th className="py-4 px-6 font-semibold text-gray-300 text-xs tracking-wider uppercase whitespace-nowrap">Satisfaction Score</th>
                <th className="py-4 px-6 font-semibold text-gray-300 text-xs tracking-wider uppercase whitespace-nowrap">Last Feedback / Complaint</th>
                <th className="py-4 px-6 font-semibold text-gray-300 text-xs tracking-wider uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-gray-400 text-sm">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-gray-400 text-sm">
                    No customers found for your company.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(client.name)}`}>
                          {client.name.charAt(0)}
                        </div>
                        <span className="font-bold text-white text-sm">{client.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${getCategoryBadge(client.category)}`}>
                        {client.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${client.health === 'HEALTHY' ? 'bg-green-500' : client.health === 'AT RISK' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getHealthBadge(client.health)}`}>
                          {client.health}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{client.orders} orders</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#f5b400" stroke="#f5b400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        <span className="text-white font-medium text-sm">
                          {client.score}
                          <span className="text-gray-500">/5</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-300 truncate block max-w-[220px]">
                        {client.feedback ? client.feedback : <span className="text-gray-500 italic">No complaints</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openFeedbackDialog(client)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] px-3 py-1.5 text-sm font-medium text-gray-200 hover:border-[#f5b400] hover:text-white transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Feedback
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditDialog(client)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] px-3 py-1.5 text-sm font-medium text-gray-200 hover:border-[#f5b400] hover:text-white transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-[520px] bg-[#0f0f0f] border border-[#2a2a2a]">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Feedback</DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Update satisfaction or complaint notes for {selectedClient?.name ?? 'the selected client'}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFeedbackSave} className="space-y-4 py-4">
            {isAddMode ? (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold opacity-70 text-gray-300">Customer</Label>
                <select
                  value={selectedClient?.id || ''}
                  onChange={(e) => {
                    const client = clients.find((item) => String(item.id) === e.target.value);
                    setSelectedClient(client || null);
                  }}
                  className="w-full bg-[#161616] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f5b400] focus:ring-1 focus:ring-[#f5b400]"
                >
                  <option value="" disabled>Select customer</option>
                  {clients.map((client) => (
                    <option key={client.id} value={String(client.id)}>{client.name}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest font-bold opacity-70 text-gray-300">Feedback / Complaint</Label>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Write feedback, complaint, or satisfaction notes..."
                className="bg-[#161616] border border-[#2a2a2a] text-white min-h-[160px]"
              />
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" onClick={() => setIsFeedbackDialogOpen(false)} className="border-white/10 text-white">
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingFeedback} className="bg-[#f5b400] hover:bg-[#dca100] text-black">
                {isSavingFeedback ? 'Saving...' : 'Save Feedback'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[720px] bg-[#0f0f0f] border border-[#2a2a2a] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Customer</DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Update customer profile and satisfaction details.
            </DialogDescription>
          </DialogHeader>

          {/* Customer Info Summary */}
          {selectedClient && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-[#161616] rounded-lg border border-[#2a2a2a] mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Customer Name</p>
                <p className="text-sm font-semibold text-white truncate">{selectedClient.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Category</p>
                <p className="text-sm font-semibold text-white truncate">{selectedClient.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Health</p>
                <p className="text-sm font-semibold text-green-400">{selectedClient.health}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Repeat Orders</p>
                <p className="text-sm font-semibold text-white">{selectedClient.orders} orders</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Satisfaction Score</p>
                <p className="text-sm font-semibold text-[#f5b400]">{selectedClient.score}/5</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Last Feedback</p>
                <p className="text-xs font-semibold text-gray-300 truncate">{selectedClient.feedback ? selectedClient.feedback.substring(0, 30) + '...' : 'None'}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleEditSave} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-widest font-bold opacity-70 text-gray-300">Name</Label>
                <Input 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="bg-[#161616] border border-[#2a2a2a] text-white"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-bold opacity-70 text-gray-300">Country</Label>
                <Input 
                  value={editForm.country} 
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  className="bg-[#161616] border border-[#2a2a2a] text-white"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-bold opacity-70 text-gray-300">Email</Label>
                <Input 
                  value={editForm.email} 
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="bg-[#161616] border border-[#2a2a2a] text-white"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-bold opacity-70 text-gray-300">Phone</Label>
                <Input 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="bg-[#161616] border border-[#2a2a2a] text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-widest font-bold opacity-70 text-gray-300">Satisfaction Score (1-5)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="5"
                  value={editForm.satisfaction_score} 
                  onChange={(e) => setEditForm({ ...editForm, satisfaction_score: parseInt(e.target.value) || 0 })}
                  className="bg-[#161616] border border-[#2a2a2a] text-white"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest font-bold opacity-70 text-gray-300">Repeat Orders</Label>
                <Input 
                  type="number" 
                  min="0"
                  value={editForm.repeat_order_count} 
                  onChange={(e) => setEditForm({ ...editForm, repeat_order_count: parseInt(e.target.value) || 0 })}
                  className="bg-[#161616] border border-[#2a2a2a] text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest font-bold opacity-70 text-gray-300">Relationship Status (Category)</Label>
              <select 
                value={editForm.relationship_status} 
                onChange={(e) => setEditForm({ ...editForm, relationship_status: e.target.value })} 
                className="w-full bg-[#161616] border border-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f5b400]"
              >
                <option>Active Client</option>
                <option>Repeat Buyer</option>
                <option>High Value Client</option>
                <option>Potential Growth Client</option>
                <option>Inactive Client</option>
              </select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest font-bold opacity-70 text-gray-300">Satisfaction / Feedback Notes</Label>
              <Textarea 
                value={editForm.satisfaction_notes} 
                onChange={(e) => setEditForm({ ...editForm, satisfaction_notes: e.target.value })} 
                className="bg-[#161616] border border-[#2a2a2a] text-white min-h-[100px]"
              />
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" onClick={() => setIsEditDialogOpen(false)} className="border border-white/10 text-white hover:bg-white/5">Cancel</Button>
              <Button type="submit" className="bg-[#f5b400] hover:bg-[#dca100] text-black font-semibold">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientSuccess;
