import soap from "soap";
import { obtenerTokenSign } from "./wsaa.js";

const WSFE_URL = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL";

export const obtenerUltimoComprobante = async ({
  cuit,
  puntoVenta,
  tipoComprobante,
}) => {
  const auth = await obtenerTokenSign();
  const client = await soap.createClientAsync(WSFE_URL);

  const [result] = await client.FECompUltimoAutorizadoAsync({
    Auth: {
      Token: auth.token,
      Sign: auth.sign,
      Cuit: Number(cuit),
    },
    PtoVta: Number(puntoVenta),
    CbteTipo: Number(tipoComprobante),
  });

  return result.FECompUltimoAutorizadoResult;
};

export const autorizarFacturaC = async ({
  cuit,
  puntoVenta,
  total,
  docTipo,
  docNro,
}) => {
  const auth = await obtenerTokenSign();
  const client = await soap.createClientAsync(WSFE_URL);

  const ultimo = await obtenerUltimoComprobante({
    cuit,
    puntoVenta,
    tipoComprobante: 11,
  });

  const proximoNumero = Number(ultimo.CbteNro || 0) + 1;

  const fecha = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  const [result] = await client.FECAESolicitarAsync({
    Auth: {
      Token: auth.token,
      Sign: auth.sign,
      Cuit: Number(cuit),
    },
    FeCAEReq: {
      FeCabReq: {
        CantReg: 1,
        PtoVta: Number(puntoVenta),
        CbteTipo: 11,
      },
      FeDetReq: {
        FECAEDetRequest: {
          Concepto: 1,
          DocTipo: Number(docTipo || 99),
          DocNro: Number(docNro || 0),
          CbteDesde: proximoNumero,
          CbteHasta: proximoNumero,
          CbteFch: fecha,
          ImpTotal: Number(total),
          ImpTotConc: 0,
          ImpNeto: Number(total),
          ImpOpEx: 0,
          ImpTrib: 0,
          ImpIVA: 0,
          MonId: "PES",
          MonCotiz: 1,
          CondicionIVAReceptorId: 5,
        },
      },
    },
  });
  console.log(
    "Enviando a AFIP:",
    JSON.stringify(
      {
        CondicionIVAReceptorId: 5,
        total,
        docTipo,
        docNro,
        proximoNumero,
      },
      null,
      2,
    ),
  );
  return result.FECAESolicitarResult;
};
