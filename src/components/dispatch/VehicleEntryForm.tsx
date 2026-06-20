import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Vehicle = {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
};

type Props = {
  onSelect: (vehicleId: string) => void;
};

const VehicleEntryForm: React.FC<Props> = ({ onSelect }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ vehicle_number: '', vehicle_type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/vehicles');
      if (!res.ok) throw new Error(`Fetch vehicles failed: ${res.status}`);
      const data = await res.json();
      setVehicles(data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setVehicles([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelected(id);
    onSelect(id);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.vehicle_number) {
      toast.error('Vehicle number is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_number: newVehicle.vehicle_number,
          vehicle_type: newVehicle.vehicle_type || 'Truck'
        })
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const data = await res.json();

      toast.success('Vehicle added successfully');
      setNewVehicle({ vehicle_number: '', vehicle_type: '' });
      setIsDialogOpen(false);
      await fetchVehicles();

      if (data && data.id) {
        setSelected(data.id);
        onSelect(data.id);
      }
    } catch (error: any) {
      console.error('Error adding vehicle:', error);
      toast.error(error.message || 'Failed to add vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">Vehicle</label>
        <button 
          type="button" 
          onClick={() => setIsDialogOpen(true)}
          className="text-xs text-primary flex items-center hover:underline"
        >
          <Plus className="h-3 w-3 mr-1" /> Add Vehicle
        </button>
      </div>
      <select
        value={selected}
        onChange={handleChange}
        className="w-full rounded-md border bg-sidebar p-2 text-sidebar-foreground"
        disabled={isLoading || vehicles.length === 0}
      >
        <option value="" disabled>
          {isLoading ? 'Loading vehicles...' : vehicles.length === 0 ? 'No vehicles available' : 'Select a vehicle'}
        </option>
        {vehicles.map(v => (
          <option key={v.id} value={v.id}>
            {v.vehicle_number} - {v.vehicle_type}
          </option>
        ))}
      </select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-sidebar text-sidebar-foreground">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>
              Add a new vehicle to the dispatch system.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddVehicle}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_number">Vehicle Number *</Label>
                <Input 
                  id="vehicle_number" 
                  value={newVehicle.vehicle_number}
                  onChange={(e) => setNewVehicle({...newVehicle, vehicle_number: e.target.value})}
                  className="bg-background"
                  placeholder="e.g. MH 04 AB 1234"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <Input 
                  id="vehicle_type" 
                  value={newVehicle.vehicle_type}
                  onChange={(e) => setNewVehicle({...newVehicle, vehicle_type: e.target.value})}
                  className="bg-background"
                  placeholder="e.g. Truck, Van, Container"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Vehicle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleEntryForm;
