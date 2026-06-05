import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { obtenerTokenSign } from "./wsaa.js";
import { obtenerUltimoComprobante, autorizarFacturaC } from "./wsfe.js";
import soap from "soap";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const app = express();

app.use(cors());
app.use(express.json());

const prepararFacturaFiscal = (factura) => {
  const empresa = factura.empresas;
  const cliente = factura.clientes;
  const detalle = factura.detalle_factura || [];

  return {
    empresa: {
      cuit: empresa.cuit,
      razonSocial: empresa.razon_social,
      puntoVenta: empresa.punto_venta,
      condicionIva: empresa.condicion_iva,
    },

    cliente: {
      nombre: cliente.nombre,
      cuit: cliente.cuit,
      condicionIva: cliente.idciva,
    },

    comprobante: {
      idFactura: factura.id,
      tipo: factura.tipo_comprobante,
      letra:
        empresa.condicion_iva === "Responsable Monotributo"
          ? "C"
          : factura.letra_comprobante,
      fecha: factura.fecha,
      total: Number(factura.total || 0),
      subtotal: Number(factura.subtotal || 0),
    },

    detalle: detalle.map((item) => ({
      codigo: item.codigo || "",
      descripcion: item.descripcion || "",
      cantidad: Number(item.cantidad || 0),
      precio: Number(item.precio || 0),
      subtotal: Number(item.subtotal || 0),
    })),
  };
};

app.get("/", (req, res) => {
  res.send("Backend fiscal funcionando");
});

app.get("/api/fiscal/token", async (req, res) => {
  try {
    const auth = await obtenerTokenSign();

    res.json({
      ok: true,
      auth,
    });
  } catch (error) {
    console.log("Error WSAA:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});
app.get("/api/fiscal/ultimo", async (req, res) => {
  try {
    const resultado = await obtenerUltimoComprobante({
      cuit: process.env.AFIP_CUIT,
      puntoVenta: process.env.AFIP_PTO_VTA,
      tipoComprobante: process.env.AFIP_CBTE_TIPO,
    });

    res.json({
      ok: true,
      resultado,
    });
  } catch (error) {
    console.log("Error WSFE:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/api/fiscal/autorizar", async (req, res) => {
  try {
    const { idFactura } = req.body;

    const { data, error } = await supabase
      .from("facturas")
      .select(
        `
        *,
        empresas(*),
        clientes(*),
        detalle_factura(*)
      `,
      )
      .eq("id", idFactura)
      .single();

    if (error) {
      return res.status(400).json({
        ok: false,
        error: error.message,
      });
    }

    if (data.estado_fiscal === "autorizada" && data.cae) {
      return res.json({
        ok: true,
        mensaje: "Factura ya autorizada",
        afip: {
          cae: data.cae,
          caeVto: data.cae_vencimiento,
          numeroFiscal: data.numero_fiscal,
          puntoVenta: data.punto_venta,
        },
        factura: data,
      });
    }

    const fiscal = prepararFacturaFiscal(data);

    const cuitEmpresa = String(fiscal.empresa.cuit).replace(/\D/g, "");
    const puntoVenta = fiscal.empresa.puntoVenta;
    const total = fiscal.comprobante.total;

    const cuitCliente = fiscal.cliente.cuit
      ? String(fiscal.cliente.cuit).replace(/\D/g, "")
      : "";

    const docTipo = 99;
    const docNro = 0;

    console.log("Datos para AFIP:", {
      cuitEmpresa,
      puntoVenta,
      total,
      docTipo,
      docNro,
    });

    const resultadoAfip = await autorizarFacturaC({
      cuit: cuitEmpresa,
      puntoVenta,
      total,
      docTipo,
      docNro,
    });

    const detalleAfip = resultadoAfip?.FeDetResp?.FECAEDetResponse?.[0];

    if (!detalleAfip || detalleAfip.Resultado !== "A") {
      return res.status(400).json({
        ok: false,
        mensaje: "AFIP rechazó la factura",
        resultadoAfip,
      });
    }

    const cae = detalleAfip.CAE;
    const caeVto = detalleAfip.CAEFchVto;
    const numeroFiscal = detalleAfip.CbteDesde;

    const { error: updateError } = await supabase
      .from("facturas")
      .update({
        cae,
        cae_vencimiento: caeVto,
        numero_fiscal: numeroFiscal,
        punto_venta: puntoVenta,
        estado_fiscal: "autorizada",
        letra_comprobante: "C",
      })
      .eq("id", idFactura);

    if (updateError) {
      return res.status(400).json({
        ok: false,
        error: updateError.message,
        resultadoAfip,
      });
    }

    res.json({
      ok: true,
      mensaje: "Factura fiscal autorizada",
      factura: data,
      fiscal,
      afip: {
        cae,
        caeVto,
        numeroFiscal,
        puntoVenta,
        resultadoAfip,
      },
    });
  } catch (err) {
    console.log("Error backend:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/fiscal/condiciones-iva", async (req, res) => {
  try {
    const auth = await obtenerTokenSign();
    const client = await soap.createClientAsync(
      "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL",
    );

    const [result] = await client.FEParamGetCondicionIvaReceptorAsync({
      Auth: {
        Token: auth.token,
        Sign: auth.sign,
        Cuit: Number(process.env.AFIP_CUIT),
      },
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.listen(3001, () => {
  console.log("Servidor backend en http://localhost:3001");
});
