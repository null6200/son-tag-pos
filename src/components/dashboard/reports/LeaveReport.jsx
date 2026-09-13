import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const LeaveReport = () => {
    const [leaveRequests, setLeaveRequests] = useState([]);

    useEffect(() => {
        const savedRequests = JSON.parse(localStorage.getItem('loungeLeaveRequests') || '[]');
        setLeaveRequests(savedRequests);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Leave Report</CardTitle>
                        <CardDescription>A comprehensive summary of all staff leave requests.</CardDescription>
                    </div>
                    <Button onClick={handlePrint} variant="outline" size="sm">
                        <Printer className="w-4 h-4 mr-2" />
                        Print Report
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Staff Name</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leaveRequests.length > 0 ? (
                            leaveRequests.map(request => (
                                <TableRow key={request.id}>
                                    <TableCell>{request.staffName}</TableCell>
                                    <TableCell>{request.startDate}</TableCell>
                                    <TableCell>{request.endDate}</TableCell>
                                    <TableCell>{request.reason}</TableCell>
                                    <TableCell>{request.status}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan="5" className="text-center">No leave data found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default LeaveReport;