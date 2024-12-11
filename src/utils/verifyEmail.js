import axios from "axios";

const verifyEmail = async (email) => {
  const url = `https://api.zerobounce.net/v2/validate?api_key=${process.env.ZEROBOUNCE_APIKEY}&email=${email}`;

  try {
    const response = await axios.get(url);
    console.log("Verification result", response.data);
    return response.data;
  } catch (error) {
    console.error("Error verifying email:", error.message);
    throw new Error("Email verification failed");
  }
};

export { verifyEmail };
