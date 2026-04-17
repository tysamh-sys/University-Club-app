const blockUser = async (userId, reason) => {
  await fetch(`${process.env.POSTIGER_URL}/blocked_users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.POSTIGER_KEY
    },
    body: JSON.stringify({
      user_id: userId,
      reason
    })
  });
};

module.exports = { blockUser };