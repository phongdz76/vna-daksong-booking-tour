import nodemailer from "nodemailer";

const user = process.env.EMAIL_USER;
const password = process.env.EMAIL_PASS;

export const mailer =
  user && password
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass: password },
      })
    : null;

export const mailFrom = user ? `"VNA Đắk Song" <${user}>` : "";
