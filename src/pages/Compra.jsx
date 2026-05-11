import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../hook/supabaseClient";

import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";

export default function Compra() {
  const inputArticuloRef = useRef(null);
  const Compra = useRef(null);
  const [proveedores, setProveedores] = useState([]);
  const [articulos, setArticulos] = useState([]);

  const [proveedorId, setProveedorId] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [formaPago, setFormaPago] = useState("Contado");
  const [medioPago, setMedioPago] = useState("efectivo");
  const [tipoComprobante, setTipoComprobante] = useState("factura");
  const [letraComprobante, setLetraComprobante] = useState("A");
  const [numeroComprobante, setNumeroComprobante] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [inputArticulo, setInputArticulo] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [detalle, setDetalle] = useState([]);

  const [openFoto, setOpenFoto] = useState(false);
  const [fotoSeleccionada, setFotoSeleccionada] = useState("");

  const totalCompra = useMemo(() => {
    return detalle.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  }, [detalle]);

  const formatoNumero = (valor) =>
    new Intl.NumberFormat("es-AR").format(Number(valor || 0));

  const cargarProveedores = async () => {
    const { data, error } = await supabase
      .from("proveedores")
      .select(
        `
      id,
      nombre,
      direccion,
      telefono,
      email,
      cuit,
      idciudad,
      idciva,
      ciudades(nombre),
      condicion_iva(descripcion)
      `,
      )
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al cargar el proveedor", error);
      return;
    }
    setProveedores(data || []);
  };

  const cargarArticulos = async () => {
    const { data, error } = await supabase
      .from("articulos")
      .select("*")
      .order("descripcion", { ascending: true });

    if (error) {
      console.error("Error al cargar articulos", error);
      return;
    }
    setArticulos(data || []);
  };
  useEffect(() => {
    cargarProveedores();
    cargarArticulos();
  }, []);

  const manejarProveedor = (id) => {
    setProveedorId(id);
    const proveedor = proveedores.find((p) => String(p.id) === String(id));
    setProveedorSeleccionado(proveedor || null);
  };
  const buscarPorCodigoODescripcion = (texto) => {
    const valor = texto.toLowerCase().trim();

    return articulos.find((a) => {
      const codigo = String(a.codigo || "").toLowerCase();
      const descripcion = String(a.descripcion || "").toLowerCase();

      return codigo === valor || descripcion.includes(valor);
    });
  };

  const seleccionarArticulo = (articulo) => {
    setArticuloSeleccionado(articulo);
    setInputArticulo(articulo.descripcion || "");

    const precioCompra =
      articulo.precio_Compra ?? articulo.precio_Costo ?? articulo.precio ?? 0;

    setPrecio(precioCompra);
    setCantidad("1");
  };

  const agregarDetalle = () => {
    if (!articuloSeleccionado) {
      alert("Seleccione un articulo");
      return;
    }
    if (!cantidad || Number(cantidad) <= 0) {
      alert("Ingrese una cantidad valida");
      return;
    }

    if (!precio || Number(precio) <= 0) {
      alert("Ingrese un precio valida");
      return;
    }
    const subtotal = Number(cantidad) * Number(precio);

    const nuevoItem = {
      id: Date.now(),
      idarticulo: articuloSeleccionado.id,
      codigo: articuloSeleccionado.codigo || "",
      descripcion: articuloSeleccionado.descripcion || "",
      cantidad: Number(cantidad),
      precio: Number(precio),
      subtotal,
    };
    setDetalle((prev) => [...prev, nuevoItem]);

    setArticuloSeleccionado(null);
    setInputArticulo("");
    setCantidad("");
    setPrecio("");

    setTimeout(() => {
      inputArticuloRef.current?.focus();
    }, 100);
  };
  const eliminarDetalle = (id) => {
    setDetalle((prev) => prev.filter((item) => item.id !== id));
  };
  const guardarCompra = async () => {
    if (!proveedorId) {
      alert("Seleccione un proveedor");
      return;
    }
    if (detalle.length === 0) {
      alert("Agregue al menos un Articulo");
      return;
    }
    const compraNueva = {
      fecha,
      idProveedor: proveedorId,
      tipoComprobante: tipoComprobante,
      letraComprobante: letraComprobante,
      numeroComprobante: numeroComprobante,
      forma_Pago: formaPago,
      medio_Pago: formaPago === "contado" ? medioPago : null,
      observaciones: observaciones || "",
      subtotal: totalCompra,
      total: totalCompra,
      saldo: formaPago === "Cuenta corriente" ? totalCompra : 0,
      estado_pago: formaPago === "Cuenta corriente" ? "pendiente" : "pagada",
    };
    const { data: compraGuardada, errorCompra } = await supabase
      .from(compras)
      .insert([compraNueva])
      .select()
      .single();

    if (errorCompra) {
      console.error("Error al guardar la compra", errorCompra);
      alert("Error al guardar la compra");
      return;
    }
    const detalleCompra = detalle.map((item) => ({
      idcompra: compraGuardada.id,
      idarticulo: item.idarticulo,
      cantidad: item.cantidad,
      precio: item.precio,
      subtotal: item.subtotal,
    }));

    const { error: errorDetalle } = await supabase
      .from("detalle_compras")
      .insert(detalleCompra);

    if (errorDetalle) {
      console.error("Error al guardar el detalle", errorDetalle);
      alert("La compra se guardo, pero hubo un error en el detalle");
      return;
    }

    for (const item of detalle) {
      const articulo = articulos.find((a) => a.id === item.idarticulo);
      const stockActual = Number(articulo?.stock || 0);
      const nuevoStock = stockActual + Number(item.cantidad);

      const { error: errorStock } = await supabase
        .from("articulos")
        .update({ stock: nuevoStock })
        .eq("id", item.idarticulo);

      if (errorStock) {
        console.error("Error al actualizar el stock", errorStock);
      }
    }
    alert("Compra guardada correctamente");

    setProveedorId("");
    setProveedorSeleccionado(null);
    setFormaPago("Contado");
    setMedioPago("Efectivo");
    setTipoComprobante("factura");
    setLetraComprobante("A");
    setNumeroComprobante("");
    setObservaciones("");
    setDetalle([]);
    await cargarArticulos();
  };

  const columnasDetalle = [
    { field: "codigo", heardName: "Codigo", width: 120 },
    { field: "descripcion", heardName: "Articulo", flex: 1 },
    {
      field: "cantidad",
      heardName: "Cantidad",
      width: 110,
      align: "right",
      headerAlign: "right",
    },
    {
      field: "precio",
      heardName: "precio",
      width: 130,
      algin: "right",
      headerAlign: "right",
      valueFormatter: (value) => `$ ${formatoNumero(value)}`,
    },
    {
      field: "subtotal",
      heardName: "Subtotal",
      width: 140,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => `$ ${formatoNumero(value)}`,
    },
    {
      field: "eliminar",
      headerName: "",
      width: 70,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          color="error"
          onClick={() => eliminarDetalle(params.row.id)}
        >
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box
      sx={{
        p: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          mb: 2,
          flesShrink: 0,
        }}
      >
        <Grid container spacing={2}>
          <Grid>
            <TextField
              select
              label="Proveedor"
              fullWidth
              size="small"
              value={proveedorId}
              onChange={(e) => manejarProveedor(e.target.value)}
            >
              {proveedores.map((p) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  {p.nombre}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              type="date"
              label="Fecha"
              fullWidth
              size="small"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Forma de pago"
              fullWidth
              size="small"
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
            >
              <MenuItem value="Contado">Contado</MenuItem>
              <MenuItem value="Cuenta corriente">Cuenta corriente</MenuItem>
            </TextField>
          </Grid>

          <Grid>
            <TextField
              select
              label="Medio de pago"
              fullWidth
              size="small"
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value)}
              disabled={formaPago !== "Contado"}
            >
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="debito">Debito</MenuItem>
              <MenuItem value="credito">Credito</MenuItem>
              <MenuItem value="transferencia">transferencia</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ sx: 12, md: 2 }}>
            <TextField
              select
              label="Comprobante"
              fullWidth
              size="small"
              value={tipoComprobante}
              onChange={(e) => setTipoComprobante(e.target.value)}
            >
              <MenuItem value="factura">Factura</MenuItem>
              <MenuItem value="nota_de_credito">Nota de credito</MenuItem>
              <MenuItem value="remito">Remito</MenuItem>
              <MenuItem value="ticket">Ticket</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              label="Letra"
              fullWidth
              size="small"
              value={letraComprobante}
              onChange={(e) => setLetraComprobante(e.target.value)}
            />
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="N° Comprobante"
                fullWidth
                size="small"
                value={numeroComprobante}
                onChange={(e) => setNumeroComprobante(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#fafafa",
                }}
              >
                <Grid container spacing={1}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2">
                      <strong>Direccion:</strong>
                      {""}
                      {proveedorSeleccionado?.direccion || "-"}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
