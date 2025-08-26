// src/authConfig.js
export const msalConfig = {
  auth: {
    clientId: "IL_TUO_CLIENT_ID", // dall'app registrata in Azure
    authority: "https://login.microsoftonline.com/common", // o tenantId se vuoi single-tenant
    redirectUri: "http://localhost:5173", // deve coincidere con quello registrato su Azure
  },
};

export const loginRequest = {
  scopes: ["User.Read", "Calendars.ReadWrite"], // i permessi che hai concesso
};

