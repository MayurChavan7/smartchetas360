import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import "echarts-gl";

// Paste the INDIA_GEO object from your HTML file into this JSON file.
import indiaGeo from "../../data/indiaGeo.json";

type Props = {
  /** GeoJSON feature name of the active region, e.g. "Maharashtra" */
  activeGeo: string;
  /** GeoJSON feature names that have projects */
  projectGeos: string[];
  /** Neighbouring features tinted like project regions (HTML "BRIDGE") */
  bridgeGeos?: string[];
  onSelectGeo?: (geoName: string) => void;
  onReady?: () => void;
};

const MAP_NAME = "India";

export default function IndiaProjectMap({
  activeGeo,
  projectGeos,
  bridgeGeos = ["Dadara and Nagar Havelli"],
  onSelectGeo,
  onReady,
}: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const selectRef = useRef(onSelectGeo);
  const readyRef = useRef(onReady);
  selectRef.current = onSelectGeo;
  readyRef.current = onReady;

  // Init once
  useEffect(() => {
    if (!elRef.current) return;
    echarts.registerMap(MAP_NAME, indiaGeo as never);
    const chart = echarts.init(elRef.current, undefined, {
      devicePixelRatio: window.devicePixelRatio || 2,
    });
    chartRef.current = chart;

    chart.on("click", (p: { name?: string }) => {
      if (p.name) selectRef.current?.(p.name);
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // Update highlight whenever the active region changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const features = (indiaGeo as { features: { properties: { name: string } }[] })
      .features;

    const data = features.map((f) => {
      const name = f.properties.name;
      const has = projectGeos.includes(name);
      const isActive = name === activeGeo;

      let height = 0.1;
      let color = "#0f1d3a";
      let borderColor = "#34507f";
      let borderWidth = 1.4;
      let label: Record<string, unknown> = { show: false };

      if (has || bridgeGeos.includes(name)) {
        color = "#21407a";
        borderColor = "#9dbbe6";
        borderWidth = 1.6;
      }
      if (has) {
        borderWidth = 2;
        label = {
          show: true,
          formatter: "📍",
          textStyle: { fontSize: 26, color: "#fff" },
        };
      }
      if (isActive) {
        height = 2.2;
        color = "#b8700a";
        borderColor = "#ffe9b0";
        borderWidth = 2.2;
        label = {
          show: true,
          formatter: `📍 ${name}`,
          textStyle: {
            color: "#fff",
            backgroundColor: "rgba(6,20,43,.88)",
            borderColor: "#fbbf24",
            borderWidth: 1.5,
            padding: [6, 12],
            borderRadius: 8,
            fontSize: 17,
            fontWeight: "bold",
          },
        };
      }

      return {
        name,
        height,
        itemStyle: { color, borderWidth, borderColor, opacity: 1 },
        label,
      };
    });

    chart.setOption(
      {
        tooltip: { show: false },
        series: [
          {
            type: "map3D",
            map: MAP_NAME,
            shading: "lambert",
            postEffect: {
              enable: true,
              bloom: { enable: true, intensity: 0.08 },
              FXAA: { enable: true },
            },
            viewControl: {
              alpha: 50,
              beta: 0,
              distance: 185,
              center: [9, -12, 0],
              minAlpha: 10,
              maxAlpha: 85,
              minDistance: 60,
              maxDistance: 220,
              autoRotate: false,
            },
            itemStyle: {
              color: "#0f1d3a",
              opacity: 1,
              borderWidth: 1.4,
              borderColor: "#34507f",
            },
            light: {
              main: { intensity: 1.3, shadow: false, alpha: 45, beta: 45 },
              ambient: { intensity: 0.8 },
            },
            data,
          },
        ],
      } as never,
      true,
    );
    readyRef.current?.();
  }, [activeGeo, projectGeos, bridgeGeos]);

  return (
    <div
      ref={elRef}
      className="h-full w-full"
      aria-label="3D map of India showing Chetas Control Systems projects"
    />
  );
}