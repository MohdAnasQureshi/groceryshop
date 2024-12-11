import nodemailer from "nodemailer";

const sendEmailtoShopOwner = async ({ to, subject, text }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.GMAIL,
    to,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};

export { sendEmailtoShopOwner };
