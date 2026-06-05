import fs from "fs";
import forge from "node-forge";
import soap from "soap";

const WSAA_URL = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL";
const TA_PATH = "./ta-wsfe.json";

const leerTA = () => {
  if (!fs.existsSync(TA_PATH)) return null;

  const ta = JSON.parse(fs.readFileSync(TA_PATH, "utf8"));

  if (ta?.token && ta?.sign && new Date() < new Date(ta.expirationTime)) {
    return {
      token: ta.token,
      sign: ta.sign,
    };
  }

  return null;
};

export const obtenerTokenSign = async () => {
  const taGuardado = leerTA();

  if (taGuardado) {
    return taGuardado;
  }

  const cert = fs.readFileSync(
    "./certificados/empresa-prueba/certificado.crt",
    "utf8",
  );

  const key = fs.readFileSync(
    "./certificados/empresa-prueba/privada.key",
    "utf8",
  );

  const now = new Date();

  const loginTicketRequest = `
    <loginTicketRequest version="1.0">
      <header>
        <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
        <generationTime>${new Date(now.getTime() - 600000).toISOString()}</generationTime>
        <expirationTime>${new Date(now.getTime() + 10 * 60 * 1000).toISOString()}</expirationTime>
      </header>
      <service>wsfe</service>
    </loginTicketRequest>
  `;

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(loginTicketRequest, "utf8");

  p7.addCertificate(cert);

  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });

  p7.sign();

  const cms = forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());

  const client = await soap.createClientAsync(WSAA_URL);
  const [result] = await client.loginCmsAsync({ in0: cms });

  const xml = result.loginCmsReturn;

  const token = xml.match(/<token>(.*?)<\/token>/)?.[1];
  const sign = xml.match(/<sign>(.*?)<\/sign>/)?.[1];
  const expirationTimeText = xml.match(
    /<expirationTime>(.*?)<\/expirationTime>/,
  )?.[1];

  const ta = {
    token,
    sign,
    expirationTime: expirationTimeText,
  };

  fs.writeFileSync(TA_PATH, JSON.stringify(ta, null, 2));

  return {
    token,
    sign,
  };
};
