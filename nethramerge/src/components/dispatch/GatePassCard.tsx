import React from 'react';

type Props = {
  token: string;
};

const GatePassCard: React.FC<Props> = ({ token }) => {
  return (
    <div className="rounded-lg border bg-sidebar p-4 space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">Gate Pass</h3>
      <p className="text-lg font-mono tracking-wider break-all">{token}</p>
      <p className="text-xs text-muted-foreground">Present this token at the gate for vehicle exit.</p>
    </div>
  );
};

export default GatePassCard;
