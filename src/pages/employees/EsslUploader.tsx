import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileType, CheckCircle, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, parse } from "date-fns";

type EsslUploaderProps = {
  employees: any[];
  onUploadComplete: () => void;
};

export function EsslUploader({ employees, onUploadComplete }: EsslUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  
  // Mappings
  const [idCol, setIdCol] = useState("");
  const [dateCol, setDateCol] = useState("");
  const [timeInCol, setTimeInCol] = useState("");
  const [timeOutCol, setTimeOutCol] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setHeaders(results.meta.fields);
          // Auto-guess common columns
          const lower = results.meta.fields.map(f => f.toLowerCase());
          const guessId = results.meta.fields[lower.findIndex(f => f.includes('emp') || f.includes('id'))];
          const guessDate = results.meta.fields[lower.findIndex(f => f.includes('date'))];
          const guessIn = results.meta.fields[lower.findIndex(f => f.includes('in') || f.includes('time'))];
          const guessOut = results.meta.fields[lower.findIndex(f => f.includes('out'))];
          
          if (guessId) setIdCol(guessId);
          if (guessDate) setDateCol(guessDate);
          if (guessIn) setTimeInCol(guessIn);
          if (guessOut) setTimeOutCol(guessOut);
        }
        setParsedData(results.data);
      },
      error: (err) => {
        toast.error("Failed to parse CSV: " + err.message);
      }
    });
  };

  const processAttendance = async () => {
    if (!idCol || !dateCol || !timeInCol) {
      return toast.error("Please map the required columns first!");
    }

    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of parsedData) {
      const bioId = row[idCol]?.toString().trim();
      const rawDate = row[dateCol]?.toString().trim();
      const rawIn = row[timeInCol]?.toString().trim();
      const rawOut = row[timeOutCol]?.toString().trim();

      if (!bioId || !rawDate || !rawIn) continue;

      // Find employee
      const emp = employees.find(e => e.biometric_id === bioId);
      if (!emp) {
        failCount++;
        continue;
      }

      try {
        // Simple date/time parsing (adjust format string if eSSL export differs)
        // Usually eSSL gives date like "YYYY-MM-DD" or "DD-MM-YYYY"
        // Let's rely on standard JS parsing or assume YYYY-MM-DD
        let formattedDate = rawDate;
        if (rawDate.includes('/')) formattedDate = rawDate.split('/').reverse().join('-');
        
        const punchDateStr = new Date(formattedDate).toISOString().split('T')[0];
        const clockInIso = new Date(`${punchDateStr}T${rawIn}`).toISOString();
        const clockOutIso = rawOut ? new Date(`${punchDateStr}T${rawOut}`).toISOString() : null;

        // Upsert logic (check if exists)
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/hr/attendance_logs?employee_id=${emp.id}&date=${punchDateStr}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const existingArr = res.ok ? await res.json() : null;
        const existing = existingArr && existingArr.length > 0 ? existingArr[0] : null;

        if (existing) {
          await fetch(`/api/hr/attendance_logs/${existing.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              clock_in: clockInIso,
              clock_out: clockOutIso,
              status: 'present'
            })
          });
        } else {
          await fetch('/api/hr/attendance_logs', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              employee_id: emp.id,
              date: punchDateStr,
              status: 'present',
              clock_in: clockInIso,
              clock_out: clockOutIso
            })
          });
        }
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    setIsProcessing(false);
    toast.success(`Processed! ${successCount} successful, ${failCount} skipped/failed.`);
    setIsOpen(false);
    onUploadComplete();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" /> Import eSSL CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Biometric Data</DialogTitle>
          <DialogDescription>
            Upload the Excel/CSV exported from your eTimeTrackLite software.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!file ? (
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-border bg-card">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileType className="w-8 h-8 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-muted-foreground">CSV files only</p>
                </div>
                <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-success/10 border-success/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
              </div>

              {headers.length > 0 && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium">Map Columns</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Employee ID Column *</Label>
                      <Select value={idCol} onValueChange={setIdCol}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Punch Date *</Label>
                      <Select value={dateCol} onValueChange={setDateCol}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Time In *</Label>
                      <Select value={timeInCol} onValueChange={setTimeInCol}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Time Out (Optional)</Label>
                      <Select value={timeOutCol} onValueChange={setTimeOutCol}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={processAttendance}
                disabled={isProcessing || !idCol || !dateCol || !timeInCol}
              >
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessing ? "Processing..." : `Import ${parsedData.length} Records`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
