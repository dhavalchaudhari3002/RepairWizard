import React from 'react';
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

export function TestNotificationButton() {
  const { toast } = useToast();
  
  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test notification to verify sound playback is working correctly.',
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Test notification sent successfully:', data);
      
      toast({
        title: 'Test Notification Sent',
        description: 'A test notification has been sent to verify the notification system.',
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast({
        title: 'Error',
        description: `Failed to send test notification: ${error instanceof Error ? error.message : String(error)}`,
        variant: 'destructive'
      });
    }
  };
  
  return (
    <Button onClick={sendTestNotification} variant="outline">
      Test Notification
    </Button>
  );
}