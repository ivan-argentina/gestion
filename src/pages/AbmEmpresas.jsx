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
  MenuItem,
} from "@mui/material";
import Chip from "@mui/material/Chip";
import { DataGrid } from "@mui/x-data-grid";
import { validarCuit } from "../utils/validarCuit";
import { formatearCuit } from "../utils/formatearCuit";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";

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
  const [condicionIva, setCondicionIva] = useState("");
  const [categoriaMonotributo, setCategoriaMonotributo] = useState("");
  const [idCiudad, setIdCiudad] = useState("");
  const [ciudades, setCiudades] = useState([]);
  const [activo, setActivo] = useState(true);

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

  const cargarCiudades = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { data, error } = await supabase
      .from("ciudades")
      .select("*")
      .eq("idempresa", idEmpresa)
      .order("nombre");
    console.log("CIUDADES:", data);
    console.log("TIPO:", typeof data);
    if (!error) {
      setCiudades(data || []);
    }
  };

  useEffect(() => {
    cargarCiudades();
  }, []);

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
    setIdCiudad("");
    setCondicionIva("");
    setCategoriaMonotributo("");
    setEditandoId(null);
    setActivo(true);
  };
  const guardarEmpresa = async () => {
    const payload = {
      razon_social: razonSocial.trim(),
      nombre_fantasia: nombreFantacia.trim(),
      cuit: cuit.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      direccion: direccion.trim(),
      activo: activo,
      telefono: telefono,
      condicion_iva: condicionIva,
      categoria_monotributo:
        condicionIva === "Monotributista" ? categoriaMonotributo : null,
      telefono: telefono,
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
    setNombreFantacia(empresa.nombre_fantasia || "");
    setCuit(empresa.cuit || "");
    setTelefono(empresa.telefono || "");
    setEmail(empresa.email || "");
    setDireccion(empresa.direccion || "");
    setIdCiudad(empresa.idciudad || "");
    setCondicionIva(empresa.condicion_iva || "");
    setCategoriaMonotributo(empresa.categoria_monotributo || "");
    setActivo(empresa.activo ?? true);
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
    {
      field: "activo",
      headerName: "Estado",
      width: 120,
      renderCell: (params) => {
        const activo = params.value;

        return (
          <Chip
            label={activo ? "Activa" : "Inactiva"}
            color={activo ? "success" : "error"}
            size="small"
          />
        );
      },
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
              label="Direccion"
              fullWidth
              size="small"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              select
              label="Ciudad"
              value={idCiudad}
              onChange={(e) => setIdCiudad(e.target.value)}
              fullWidth
              size="small"
            >
              {Array.isArray(ciudades) &&
                ciudades.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.nombre}
                  </MenuItem>
                ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              fullWidth
              size="small"
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
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Condición IVA"
              value={condicionIva}
              onChange={(e) => setCondicionIva(e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                htmlInput: {
                  inputMode: "numeric",
                },
              }}
            >
              <MenuItem value="Responsable Inscripto">
                Responsable Inscripto
              </MenuItem>
              <MenuItem value="Monotributista">Monotributista</MenuItem>
              <MenuItem value="Exento">Exento</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
            {condicionIva === "Monotributista" && (
              <TextField
                select
                label="Categoría"
                value={categoriaMonotributo}
                onChange={(e) => setCategoriaMonotributo(e.target.value)}
                fullWidth
                size="small"
              >
                {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"].map(
                  (cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ),
                )}
              </TextField>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Estado"
              value={String(activo)}
              onChange={(e) => setActivo(e.target.value === "true")}
              fullWidth
              size="small"
            >
              <MenuItem value="true">Activa</MenuItem>
              <MenuItem value="false">Inactiva</MenuItem>
            </TextField>
          </Grid>
          <Grid
            size={{ xs: 12, md: 3 }}
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={guardarEmpresa}
            >
              {editandoId ? "Actualizar" : "Guardar"}
            </Button>

            <Button onClick={limpiarFormulario}>Cancelar</Button>
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
