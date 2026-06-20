import React, { useEffect, useState } from 'react';
// Using server-side API instead of Supabase client to avoid schema cache issues
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Driver = {
  id: string;
  driver_name: string;
  license_number: string;
};

type Props = {
  onSelect: (driverId: string) => void;
};

const DriverSelect: React.FC<Props> = ({ onSelect }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({ driver_name: '', license_number: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/drivers')
      if (!res.ok) throw new Error('Failed to load drivers')
      const data = await res.json()
      setDrivers(data as Driver[])
    } catch (err) {
      console.error('fetchDrivers error', err)
      toast.error('Failed to load drivers')
    } finally {
      setIsLoading(false)
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelected(id);
    onSelect(id);
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.driver_name) {
      toast.error('Driver name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_name: newDriver.driver_name, license_number: newDriver.license_number || null })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to add driver')
      }
      const data = await res.json()
      toast.success('Driver added successfully')
      setNewDriver({ driver_name: '', license_number: '' })
      setIsDialogOpen(false)
      await fetchDrivers()
      if (data) {
        setSelected(data.id)
        onSelect(data.id)
      }
    } catch (error: any) {
      console.error('Error adding driver:', error)
      toast.error(error.message || 'Failed to add driver')
    } finally {
      setIsSubmitting(false)
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">Driver</label>
        <button 
          type="button" 
          onClick={() => setIsDialogOpen(true)}
          className="text-xs text-primary flex items-center hover:underline"
        >
          <Plus className="h-3 w-3 mr-1" /> Add Driver
        </button>
      </div>
      <select
        value={selected}
        onChange={handleChange}
        className="w-full rounded-md border bg-sidebar p-2 text-sidebar-foreground"
        disabled={isLoading || drivers.length === 0}
      >
        <option value="" disabled>
          {isLoading ? 'Loading drivers...' : drivers.length === 0 ? 'No drivers available' : 'Select a driver'}
        </option>
        {drivers.map(d => (
          <option key={d.id} value={d.id}>
            {d.driver_name} - {d.license_number}
          </option>
        ))}
      </select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-sidebar text-sidebar-foreground">
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
            <DialogDescription>
              Add a new driver to the dispatch system.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDriver}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Driver Name *</Label>
                <Input 
                  id="name" 
                  value={newDriver.driver_name}
                  onChange={(e) => setNewDriver({...newDriver, driver_name: e.target.value})}
                  className="bg-background"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_number">License Number</Label>
                <Input 
                  id="license_number" 
                  value={newDriver.license_number}
                  onChange={(e) => setNewDriver({...newDriver, license_number: e.target.value})}
                  className="bg-background"
                  placeholder="e.g. DL-1234567890"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Driver'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverSelect;
