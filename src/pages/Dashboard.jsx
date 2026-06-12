import { useEffect, useState } from "react";
import { Box, Card, CardContent, Chip, Grid, Typography } from "@mui/material";
import { supabase } from "../hook/supabaseClient";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";

const API_URL = "http://localhost:3001";

export default function Dashboard() {
  const [certificado, setCertificado] = useState(null);
  const [resumen, setResumen] = useState({
    ventasMes: 0,
    saldoCobrar: 0,
    comprobantesMes: 0,
  });

  const cargarResumen = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    const { data, error } = await supabase
      .from("facturas")
      .select("total, saldo, estado_fiscal, fecha")
      .eq("idempresa", idEmpresa)
      .gte("fecha", desde)
      .lte("fecha", hasta);

    if (error) {
      console.log("Error resumen:", error);
      return;
    }

    const ventasMes = (data || [])
      .filter((f) => f.estado_fiscal === "autorizada")
      .reduce((acc, f) => acc + Number(f.total || 0), 0);

    const comprobantesMes = (data || []).filter(
      (f) => f.estado_fiscal === "autorizada",
    ).length;

    const { data: pendientes } = await supabase
      .from("facturas")
      .select("saldo")
      .eq("idempresa", idEmpresa)
      .gt("saldo", 0);

    const saldoCobrar = (pendientes || []).reduce(
      (acc, f) => acc + Number(f.saldo || 0),
      0,
    );

    setResumen({
      ventasMes,
      saldoCobrar,
      comprobantesMes,
    });
  };

  const cargarEstadoCertificado = async () => {
    try {
      const res = await fetch(`${API_URL}/api/fiscal/certificado/estado`);
      const data = await res.json();

      if (data.ok) {
        setCertificado(data);
      }
    } catch (error) {
      console.log("Error certificado:", error);
    }
  };

  useEffect(() => {
    cargarEstadoCertificado();
    cargarResumen();
  }, []);

  const configCertificado = {
    vigente: {
      label: "Certificado vigente",
      color: "success",
    },
    por_vencer: {
      label: "Certificado por vencer",
      color: "warning",
    },
    vencido: {
      label: "Certificado vencido",
      color: "error",
    },
  };

  const estadoCert = certificado?.estado || "vigente";
  const config = configCertificado[estadoCert];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Dashboard
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Ventas del mes
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {resumen.ventasMes.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Saldo a cobrar
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {resumen.saldoCobrar.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Comprobantes del mes
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {resumen.comprobantesMes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Estado AFIP
              </Typography>

              <Box sx={{ mt: 1, mb: 1 }}>
                <Chip
                  label={config.label}
                  color={config.color}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <Typography variant="body2">
                Vence:{" "}
                {certificado?.vence
                  ? new Date(certificado.vence).toLocaleDateString("es-AR")
                  : "-"}
              </Typography>

              <Typography variant="body2">
                Días restantes: {certificado?.diasRestantes ?? "-"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
