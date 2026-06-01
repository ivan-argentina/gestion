import { useEffect, useState } from "react";
import { supabase } from "../hook/supabaseClient";
import {
  Box,
  Button,
  Grid,
  Paper,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { validarCuit } from "../utils/validarCuit";
import { formatearCuit } from "../utils/formatearCuit";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";

export default function AbmEmpresas() {
  const [empresas, setEmpresas] = useState([]);
  const [razonSocial, setRazonSocial] = useState([]);
  const [nombreFantacia, setNombreFantacia] = useState("");
  const [cuit, setCuit] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [errorCuit, setErrorCuit] = useState("");

  const handleCuitChange = (e) => {
    const valor = e.target.value.replace(/\D/g, "");
    setCuit(valor);

    if (valor.length === 11) {
      if (!validarCuit(valor)) {
        setErrorCuit("CUIT inválido");
      } else {
        setErrorCuit("");
      }
    } else {
      setErrorCuit("");
    }
  };
  const cargarEmpresas = async () => {
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("razon_social", { ascending: true });

    if (error) {
      console.log(error);
      return;
    }

    setEmpresas([...data]);
  };

  useEffect(() => {
    cargarEmpresas();
  }, []);

  const limpiarFormulario = () => {
    setRazonSocial("");
    setNombreFantacia("");
    setCuit("");
    setTelefono("");
    setEmail("");
    setDireccion("");
    setEditandoId(null);
  };
  const guardarEmpresa = async () => {
    const payload = {
      razon_social: razonSocial.trim(),
      nombre_fantasia: nombreFantacia.trim(),
      cuit: cuit.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      direccion: direccion.trim(),
      activo: true,
    };
    if (!payload.razon_social) {
      alert("ingrese razon social");
      return;
    }

    if (editandoId) {
      const { error } = await supabase
        .from("empresas")
        .update(payload)
        .eq("id", editandoId);

      if (error) {
        console.log(error);
        alert("Error al actualizar la empresa");
        return;
      }
    } else {
      const { error } = await supabase.from("empresas").insert([payload]);

      if (error) {
        console.log(error);
        alert("error al guardar empresa");
        return;
      }
    }
    limpiarFormulario();
    await cargarEmpresas();
  };
  const editarEmpresa = (empresa) => {
    setEditandoId(empresa.id);
    setRazonSocial(empresa.razon_social || "");
    setNombreFantacia(empresa.nombre_fantacia || "");
    setCuit(empresa.cuit || "");
    setTelefono(empresa.telefono || "");
    setEmail(empresa.email || "");
    setDireccion(empresa.direccion || "");
  };

  const eliminarEmpresa = async (id) => {
    if (!confirm("Eliminar Empresa")) return;

    const { error } = await supabase.from("empresas").delete().eq("id", id);

    if (error) {
      console.log(error);
      alert("No se pudo eliminar la empresa");
      return;
    }
    cargarEmpresas();
  };

  const columns = [
    { field: "razon_social", headerName: "Razon Social", flex: 1 },
    { field: "nombre_fantasia", headerName: "Fantasia", flex: 1 },
    { field: "cuit", headerName: "CUIT", width: 140 },
    { field: "telefono", headerName: "Telefono", width: 140 },
    { field: "email", headerName: "Email", flex: 1 },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 180,
      renderCell: (params) => (
        <Box>
          <IconButton onClick={() => editarEmpresa(params.row)} color="primary">
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => eliminarEmpresa(params.row.id)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Empresas
      </Typography>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Razon Social"
              fullWidth
              size="small"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Nombre de Fantacia"
              fullWidth
              size="small"
              value={nombreFantacia}
              onChange={(e) => setNombreFantacia(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Cuit"
              fullWidth
              size="small"
              value={formatearCuit(cuit)}
              onChange={handleCuitChange}
              error={!!errorCuit}
              helperText={errorCuit}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Email"
              fullWidth
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Grid>

          <Grid>
            <TextField
              label="Direccion"
              fullWidth
              size="small"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={guardarEmpresa}
            >
              {editandoId ? "Actualizar Empresa" : "Guardar Empresa"}
            </Button>
            <Button xs={{ ml: 1 }} onClick={limpiarFormulario}>
              Cancelar
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <Paper sx={{ height: 420, width: "100%", borderRadius: 3 }}>
        <DataGrid
          rows={empresas}
          columns={columns}
          getRowId={(row) => row.id}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
          }}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </Paper>
    </Box>
  );
}
