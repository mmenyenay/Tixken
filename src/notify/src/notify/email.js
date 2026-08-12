const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
      auth: {
          user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
                }
                });

                async function sendEmail(to, subject, html) {
                  try {
                      await transporter.sendMail({
                            from: process.env.EMAIL_USER,
                                  to,
                                        subject,
                                              html
                                                  });
                                                    } catch (err) {
                                                        console.error('Email send failed:', err.message);
                                                          }
                                                          }

                                                          module.exports = { sendEmail };