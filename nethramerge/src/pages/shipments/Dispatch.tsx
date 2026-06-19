import React, { useEffect, useMemo, useState } from 'react';
import { useAuth, useCan } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import VehicleEntryForm from '@/components/dispatch/VehicleEntryForm';
import DriverSelect from '@/components/dispatch/DriverSelect';
import SchedulerCalendar from '@/components/dispatch/SchedulerCalendar';
import GatePassCard from '@/components/dispatch/GatePassCard';
import ChallanPreview from '@/components/dispatch/ChallanPreview';
import StatusTimeline from '@/components/dispatch/StatusTimeline';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Dispatch = () => {
  const { profile, session } = useAuth();
  const canDispatch = useCan('shipments.dispatch');
  const navigate = useNavigate();

  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [schedule, setSchedule] = useState<{ start: string; end: string } | null>(null);
  const [gatePassToken, setGatePassToken] = useState<string>('');
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [hasShipments, setHasShipments] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [debugError, setDebugError] = useState<string>('');

  // Real‑time subscription
  useEffect(() => {
    const channel = supabase.channel('public:shipment_status_logs');
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipment_status_logs' }, payload => {
        setStatusLogs(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const checkShipments = async () => {
      try {
        if (!session?.access_token) return;
        const res = await fetch('/api/dispatch/shipment_dispatches/count', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const { count } = await res.json();
          setHasShipments(count > 0);
        } else {
          setHasShipments(false);
        }
      } catch (err) {
        console.error('Failed to check shipment count', err);
        setHasShipments(false);
      }
    };
    checkShipments();
  }, [session?.access_token]);

  const handleCreateShipment = async () => {
    if (!vehicleId || !driverId) {
      toast.error('Please select a vehicle and a driver before creating shipment.');
      return;
    }

    if (!schedule || !schedule.start || !schedule.end) {
      toast.error('Please set a valid schedule start and end date/time.');
      return;
    }

    if (new Date(schedule.start) > new Date(schedule.end)) {
      toast.error('Schedule start must be before end.');
      return;
    }

    setIsCreating(true);
    try {
      if (!session?.access_token) throw new Error("Authentication session missing");
      const res = await fetch('/api/dispatch/shipment_dispatches', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          driver_id: driverId,
          schedule_start: schedule.start,
          schedule_end: schedule.end,
          status: 'pending'
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to create shipment');
      }

      const shipment = await res.json();

      setGatePassToken(shipment.gate_pass_token);
      setHasShipments(true);
      toast.success('Shipment created successfully.');
      navigate(`/shipments/${shipment.id}`);
    } catch (err: any) {
      console.error('Failed to create shipment', err);
      toast.error(err?.message || 'Failed to create shipment');
    } finally {
      setIsCreating(false);
    }
  };

  if (!canDispatch) {
    return <div className="p-4 text-red-500">You do not have permission to dispatch shipments.</div>;
  }

  const filteredStatusLogs = useMemo(() => {
    if (!schedule) return statusLogs;
    const startTime = new Date(schedule.start).getTime();
    const endTime = new Date(schedule.end).getTime();
    return statusLogs.filter((log) => {
      const timestamp = new Date(log.changed_at || log.created_at || '').getTime();
      return !Number.isNaN(timestamp) && timestamp >= startTime && timestamp <= endTime;
    });
  }, [schedule, statusLogs]);

  return (
    <div className="p-6 space-y-6">
      {debugError && <div className="p-4 bg-red-100 text-red-800 font-bold border border-red-500 mb-4 rounded">DEBUG ERROR: {debugError}</div>}
      <h1 className="text-2xl font-semibold">New Shipment Dispatch</h1>
      <VehicleEntryForm onSelect={setVehicleId} />
      <DriverSelect onSelect={setDriverId} />
      <SchedulerCalendar onSchedule={setSchedule} />
      <button
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 disabled:opacity-60"
        onClick={handleCreateShipment}
        disabled={isCreating}
      >
        {isCreating ? 'Creating shipment...' : 'Create Shipment'}
      </button>
      {gatePassToken && <GatePassCard token={gatePassToken} />}
      {/* Placeholder for challan preview – could be generated after shipment creation */}
      {gatePassToken && <ChallanPreview shipmentId={gatePassToken.split('-')[1]} />}
      <StatusTimeline logs={filteredStatusLogs} hasShipments={hasShipments} />
    </div>
  );
};

export default Dispatch;
