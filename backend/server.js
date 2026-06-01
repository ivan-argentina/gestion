import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { obtenerTokenSign } from "./wsaa.js";

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
      letra: factura.letra_comprobante,
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

app.post("/api/fiscal/autorizar", async (req, res) => {
  try {
    const { idFactura } = req.body;

    console.log("Buscando factura:", idFactura);

    const { data, error } = await supabase
      .from("facturas")
      .select(`
        *,
        empresas(*),
        clientes(*),
        detalle_factura(*)
      `)
      .eq("id", idFactura)
      .single();

    if (error) {
      console.log("Error al buscar factura:", error);

      return res.status(400).json({
        ok: false,
        error: error.message,
      });
    }

    console.log("Factura encontrada:");
    console.log(data);

    const fiscal = prepararFacturaFiscal(data);

    console.log("Factura fiscal preparada:");
    console.log(fiscal);

    res.json({
      ok: true,
      mensaje: "Factura fiscal preparada",
      factura: data,
      fiscal,
    });
  } catch (err) {
    console.log("Error backend:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});
app.post("/api/fiscal/autorizar", async (req, res) => {
  // tu código actual
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

app.listen(3001, () => {
  console.log("Servidor backend en http://localhost:3001");
});