import nodemailer from "nodemailer";

const sendEmailtoShopOwner = async ({ to, subject, text }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "qureshianas4710@gmail.com",
      pass: "qftpnasnaihkdxln",
    },
  });

  const mailOptions = {
    from: "qureshianas4710@gmail.com",
    to,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};

export { sendEmailtoShopOwner };
