import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendWelcomeEmail(userEmail: string, firstName: string): Promise<boolean> {
  try {
    console.log('Attempting to send welcome email to:', userEmail);

    if (!userEmail || !firstName) {
      console.error('Invalid parameters:', { userEmail, firstName });
      return false;
    }

    const msg = {
      to: userEmail,
      from: 'notifications@airepairassistant.com', // Replace with your verified sender
      subject: 'Welcome to AI Repair Assistant!',
      text: `Welcome to AI Repair Assistant, ${firstName}!\n\nThank you for joining our platform.\n\nIf you have any questions, our support team is here to help.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome, ${firstName}! 🎉</h2>
          <p>Thank you for joining AI Repair Assistant. We're excited to help you with your repair needs!</p>
          <p>You can now log in to your account and start using our services.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">AI Repair Assistant - Your intelligent repair companion</p>
        </div>
      `
    };

    const response = await sgMail.send(msg);
    console.log('Welcome email sent successfully:', {
      response: response[0].statusCode,
      to: userEmail,
      firstName: firstName
    });

    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    if (error.response) {
      console.error('SendGrid API Error:', {
        status: error.response.status,
        body: error.response.body
      });
    }
    return false;
  }
}