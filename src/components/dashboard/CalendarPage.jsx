
import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CalendarPage = () => {
  const [date, setDate] = React.useState(new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h2 className="text-3xl font-bold gradient-text">Calendar</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="w-full">
            <CardContent className="p-2 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="p-0"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex justify-between",
                  head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                  row: "flex w-full mt-2 justify-between",
                  cell: "h-16 w-full text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-16 w-full p-1 font-normal aria-selected:opacity-100 flex flex-col items-start justify-start",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                  day_today: "bg-accent text-accent-foreground rounded-md",
                }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>
                Events for {date ? date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Today'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                <p>No events scheduled for this day.</p>
                <p className="text-xs mt-2">This is a placeholder. Feature coming soon!</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CalendarPage;
