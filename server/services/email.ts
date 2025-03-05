import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendWelcomeEmail(userEmail: string, firstName: string): Promise<boolean> {
  try {
    console.log('Starting welcome email process for:', {
      to: userEmail,
      firstName,
      hasApiKey: !!process.env.SENDGRID_API_KEY
    });

    if (!userEmail || !firstName) {
      console.error('Invalid parameters:', { userEmail, firstName });
      return false;
    }

    const msg = {
      to: userEmail,
      from: 'chaudharydhaval303@gmail.com',
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

    console.log('Attempting to send email via SendGrid...');
    const [response] = await sgMail.send(msg);

    console.log('SendGrid API Response:', {
      statusCode: response?.statusCode,
      headers: response?.headers,
      to: userEmail,
      authenticatedDomain: 'reusehub.org'
    });

    if (response?.statusCode === 202) {
      console.log('Welcome email sent successfully!');
      return true;
    } else {
      console.error('Unexpected status code from SendGrid:', response?.statusCode);
      return false;
    }
  } catch (error: any) {
    console.error('Error sending welcome email:', {
      error: error.message,
      response: error.response?.body,
      code: error.code,
      dnsStatus: error.response?.body?.errors?.[0]?.message?.includes('DNS') ? 'DNS issue detected' : 'No DNS issues reported'
    });

    if (error.response?.body?.errors) {
      console.error('SendGrid API Errors:', error.response.body.errors);
    }

    return false;
  }
}

export async function sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<boolean> {
  try {
    console.log('Starting password reset email process for:', {
      to: userEmail,
      hasToken: !!resetToken,
      hasApiKey: !!process.env.SENDGRID_API_KEY
    });

    if (!userEmail || !resetToken) {
      console.error('Invalid parameters:', { userEmail, hasToken: !!resetToken });
      return false;
    }

    // Generate reset link based on environment
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.APP_URL || 'https://ai-repair-assistant.repl.co')
      : (process.env.REPL_SLUG && process.env.REPL_OWNER 
         ? `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.repl.dev` 
         : 'http://0.0.0.0:5000');

    console.log('Environment details:', {
      NODE_ENV: process.env.NODE_ENV,
      REPL_SLUG: process.env.REPL_SLUG,
      REPL_OWNER: process.env.REPL_OWNER,
      APP_URL: process.env.APP_URL
    });

    const encodedToken = encodeURIComponent(resetToken);
    const resetLink = `${baseUrl}/reset-password?token=${encodedToken}`;

    console.log('Generated reset link:', resetLink);

    const msg = {
      to: userEmail,
      from: 'chaudharydhaval303@gmail.com',
      subject: 'Reset Your Password - AI Repair Assistant',
      text: `Reset your password by visiting this link: ${resetLink}\n\nThis link will expire in 1 hour for security reasons.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">AI Repair Assistant - Your intelligent repair companion</p>
        </div>
      `
    };

    console.log('Sending password reset email...');
    const [response] = await sgMail.send(msg);

    console.log('SendGrid API Response:', {
      statusCode: response?.statusCode,
      headers: response?.headers,
      to: userEmail
    });

    return response?.statusCode === 202;
  } catch (error: any) {
    console.error('Error sending password reset email:', {
      error: error.message,
      response: error.response?.body,
      code: error.code
    });

    if (error.response?.body?.errors) {
      console.error('SendGrid API Errors:', error.response.body.errors);
    }

    return false;
  }
}