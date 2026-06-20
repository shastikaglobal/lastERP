import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Props = {
  shipmentId: string;
};

type ChallanData = {
  id: string;
  challan_number: string;
  items: string;
  created_at: string;
};

const ChallanPreview: React.FC<Props> = ({ shipmentId }) => {
  const [challan, setChallan] = useState<ChallanData | null>(null);

  useEffect(() => {
    if (!shipmentId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('challans')
        .select('*')
        .eq('shipment_id', shipmentId)
        .maybeSingle();
      if (data) setChallan(data as ChallanData);
    };
    fetch();
  }, [shipmentId]);

  if (!challan) {
    return (
      <div className="rounded-lg border bg-sidebar p-4 text-sm text-muted-foreground">
        No challan generated yet for this shipment.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-sidebar p-4 space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">Challan Preview</h3>
      <p className="text-base font-medium">#{challan.challan_number}</p>
      <p className="text-sm text-muted-foreground">{challan.items}</p>
      <p className="text-xs text-muted-foreground">
        Created: {new Date(challan.created_at).toLocaleString()}
      </p>
    </div>
  );
};

export default ChallanPreview;
