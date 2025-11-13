import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const CashDrawerModal = ({ isOpen, onClose, onSubmit }) => {
    const [type, setType] = useState('in');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (isOpen) {
            setType('in');
            setAmount('');
            setReason('');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a valid positive amount.", variant: "destructive" });
            return;
        }
        if (!reason.trim()) {
            toast({ title: "Reason Required", description: "Please provide a reason for this transaction.", variant: "destructive" });
            return;
        }
        onSubmit({ type, amount: numericAmount, reason });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Cash Drawer Transaction</DialogTitle>
                    <DialogDescription>Record a cash-in or cash-out from the drawer.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Transaction Type</Label>
                        <ToggleGroup type="single" value={type} onValueChange={(value) => { if (value) setType(value); }} className="grid grid-cols-2">
                            <ToggleGroupItem value="in" aria-label="Cash In">
                                <ArrowUpCircle className="h-4 w-4 mr-2 text-green-500" />
                                Cash In
                            </ToggleGroupItem>
                            <ToggleGroupItem value="out" aria-label="Cash Out">
                                <ArrowDownCircle className="h-4 w-4 mr-2 text-red-500" />
                                Cash Out
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="amount">Amount</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="pl-8" step="0.01" />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Petty cash for supplies" />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Submit Transaction</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CashDrawerModal;