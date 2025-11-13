import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Eye, XCircle, ArrowLeft, User, Mail, Building, MapPin, DollarSign, TrendingUp, TrendingDown, FileText, CreditCard } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

const ShiftRegisterReport = ({ user }) => {
  const [shifts, setShifts] = useState([]);
  const [viewingShift, setViewingShift] = useState(null);
  const [closingShift, setClosingShift] = useState(null);
  const [closingCash, setClosingCash] = useState('');

  useEffect(() => {
    const savedShifts = JSON.parse(localStorage.getItem('loungeShiftRegisters') || '[]');
    setShifts(savedShifts.sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt)));
  }, []);

  const handleCloseShift = (e) => {
    e.preventDefault();
    const cashAmount = parseFloat(closingCash);
    if (isNaN(cashAmount) || cashAmount < 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid closing cash amount.", variant: "destructive" });
      return;
    }
    
    const updatedShift = {
      ...closingShift,
      closedAt: new Date().toISOString(),
      closingCash: cashAmount,
      difference: cashAmount - closingShift.expectedCash,
    };

    const updatedShifts = shifts.map(s => s.id === closingShift.id ? updatedShift : s);
    localStorage.setItem('loungeShiftRegisters', JSON.stringify(updatedShifts));
    setShifts(updatedShifts);
    
    toast({ title: "Register Closed!", description: `Shift for ${closingShift.openedBy} has been closed.` });
    setClosingShift(null);
    setClosingCash('');
  };

  if (viewingShift) {
    return <ShiftDetailsView shift={viewingShift} onBack={() => setViewingShift(null)} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Shift Register Logs</CardTitle>
          <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opened By</TableHead>
                <TableHead>Open Time</TableHead>
                <TableHead>Close Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>{shift.openedBy}</TableCell>
                  <TableCell>{new Date(shift.openedAt).toLocaleString()}</TableCell>
                  <TableCell>{shift.closedAt ? new Date(shift.closedAt).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={shift.closedAt ? 'secondary' : 'destructive'}>
                      {shift.closedAt ? 'Closed' : 'Open'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">${(shift.cashSales + shift.cardSales).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewingShift(shift)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!shift.closedAt && (
                      <Button variant="ghost" size="icon" onClick={() => setClosingShift(shift)}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {closingShift && (
        <Dialog open={!!closingShift} onOpenChange={() => setClosingShift(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Close Shift Register</DialogTitle>
              <DialogDescription>
                Closing shift for {closingShift.openedBy} opened at {new Date(closingShift.openedAt).toLocaleString()}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCloseShift} className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Expected amount: <span className="font-bold text-foreground">${closingShift.expectedCash.toFixed(2)}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="closing-cash">Counted Cash Amount</Label>
                <Input id="closing-cash" type="number" step="0.01" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} placeholder="e.g., 4100.50" />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setClosingShift(null)}>Cancel</Button>
                <Button type="submit">Confirm & Close Shift</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const ShiftDetailsView = ({ shift, onBack }) => {
  const productsByBrand = shift.soldProducts.reduce((acc, product) => {
    const brand = product.brand || 'Unbranded';
    if (!acc[brand]) {
      acc[brand] = { quantity: 0, total: 0 };
    }
    acc[brand].quantity += product.quantity;
    acc[brand].total += product.total;
    return acc;
  }, {});

  const totalSales = shift.cashSales + shift.cardSales;

  return (
    <div className="space-y-6">
      <Button onClick={onBack} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to List</Button>
      
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Shift Details</CardTitle>
          <CardDescription>
            Shift for <span className="font-semibold">{shift.userDetails.username}</span> from {new Date(shift.openedAt).toLocaleString()} to {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : 'Now'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <section>
            <h3 className="text-lg font-semibold mb-2">User & Location Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <InfoItem icon={User} label="Username" value={shift.userDetails.username} />
              <InfoItem icon={Mail} label="Email" value={shift.userDetails.email} />
              <InfoItem icon={Building} label="Branch" value={shift.userDetails.branch} />
              <InfoItem icon={MapPin} label="Section" value={shift.userDetails.section} />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">Total Sales Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryCard icon={TrendingUp} title="Total Sales" value={totalSales.toFixed(2)} color="text-green-500" />
              <SummaryCard icon={DollarSign} title="Total Payments" value={(shift.cashSales + shift.cardSales).toFixed(2)} color="text-blue-500" />
              <SummaryCard icon={CreditCard} title="Credit Sales" value={shift.creditSales.toFixed(2)} color="text-yellow-500" />
              <SummaryCard icon={TrendingDown} title="Total Refund" value={shift.refunds.toFixed(2)} color="text-red-500" />
              <SummaryCard icon={FileText} title="Total Expenses" value={shift.expenses.toFixed(2)} color="text-orange-500" />
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <h3 className="text-lg font-semibold mb-2">Products Sold</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shift.soldProducts.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-center">{p.quantity}</TableCell>
                      <TableCell className="text-right">${p.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Sales by Brand</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(productsByBrand).map(([brand, data]) => (
                    <TableRow key={brand}>
                      <TableCell>{brand}</TableCell>
                      <TableCell className="text-center">{data.quantity}</TableCell>
                      <TableCell className="text-right">${data.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
    <Icon className="w-5 h-5 text-primary mt-1" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  </div>
);

const SummaryCard = ({ icon: Icon, title, value, color }) => (
  <Card className="p-4">
    <div className="flex items-center gap-4">
      <Icon className={`w-6 h-6 ${color}`} />
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={`text-xl font-bold ${color}`}>${value}</p>
      </div>
    </div>
  </Card>
);

export default ShiftRegisterReport;