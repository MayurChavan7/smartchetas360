import { useEffect, useRef } from "react";
import * as echarts from "echarts";

import indiaGeo from "../../data/indiaGeo.json";

type Props = {
  /** GeoJSON feature name of the active region, e.g. "Maharashtra" */
  activeGeo: string;
  /** GeoJSON feature names that have projects */
  projectGeos: string[];
  /** Neighbouring features tinted like project regions */
  bridgeGeos?: string[];
  onSelectGeo?: (geoName: string) => void;
  onReady?: () => void;
};

const MAP_NAME = "India";

type IndiaFeature = {
  properties: {
    name: string;
  };
};

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

  // Initialize the flat map once. A 2D map series has no camera angle,
  // perspective rotation, or 3D terrain tilt.
  useEffect(() => {
    const element = elRef.current;
    if (!element) return;

    echarts.registerMap(MAP_NAME, indiaGeo as never);

    const chart = echarts.init(element, undefined, {
      renderer: "canvas",
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    });

    chartRef.current = chart;

    chart.on("click", (params: { name?: string }) => {
      if (params.name) selectRef.current?.(params.name);
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(element);

    // Initial neutral map prevents an empty frame while the data effect runs.
    chart.setOption({
      animation: true,
      backgroundColor: "transparent",
      tooltip: { show: false },
      series: [
        {
          type: "map",
          map: MAP_NAME,
          roam: true,
          zoom: 1,
          scaleLimit: { min: 0.85, max: 3.5 },
          layoutCenter: ["50%", "50%"],
          layoutSize: "88%",
          aspectScale: 0.9,
          selectedMode: false,
          itemStyle: {
            areaColor: "#172F4D",
            borderColor: "#8BAAC8",
            borderWidth: 1.1,
          },
          emphasis: {
            label: { show: false },
            itemStyle: {
              areaColor: "#2B5B87",
              borderColor: "#D7E9F8",
              borderWidth: 1.5,
            },
          },
          data: [],
        },
      ],
    });

    readyRef.current?.();

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // Update region colors and labels when the active project location changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const features = (indiaGeo as { features: IndiaFeature[] }).features;

    const data = features.map((feature) => {
      const name = feature.properties.name;
      const hasProjects = projectGeos.includes(name);
      const isBridge = bridgeGeos.includes(name);
      const isActive = name === activeGeo;

      let areaColor = "#142A45";
      let borderColor = "#52718F";
      let borderWidth = 1;
      let label: Record<string, unknown> = { show: false };

      if (hasProjects || isBridge) {
        areaColor = "#28619A";
        borderColor = "#9BC5E8";
        borderWidth = 1.35;
      }

      // Keep labels focused on project regions so the national map stays readable.
      if (hasProjects) {
        label = {
          show: true,
          formatter: `📍 ${name}`,
          position: "inside",
          color: "#FFF4D6",
          fontSize: 10,
          fontWeight: 800,
          backgroundColor: "rgba(8, 24, 46, 0.78)",
          borderColor: "rgba(247, 196, 85, 0.72)",
          borderWidth: 0.8,
          borderRadius: 5,
          padding: [3, 5],
          textBorderColor: "rgba(7, 20, 38, 0.9)",
          textBorderWidth: 1,
          overflow: "truncate",
        };
      }

      if (isActive) {
        areaColor = "#E7A928";
        borderColor = "#FFF0BF";
        borderWidth = 2;
        label = {
          show: true,
          formatter: `📍 ${name}`,
          position: "top",
          distance: 9,
          color: "#FFF9E8",
          backgroundColor: "rgba(10, 28, 49, 0.97)",
          borderColor: "#F4C65E",
          borderWidth: 1.5,
          borderRadius: 7,
          padding: [7, 11],
          fontSize: 13,
          fontWeight: 800,
          textBorderColor: "rgba(7, 20, 38, 0.75)",
          textBorderWidth: 1,
        };
      }

      return {
        name,
        itemStyle: {
          areaColor,
          borderColor,
          borderWidth,
        },
        label,
      };
    });

    chart.setOption(
      {
        animationDurationUpdate: 450,
        tooltip: {
          show: true,
          trigger: "item",
          backgroundColor: "rgba(8, 24, 46, 0.96)",
          borderColor: "#4C83B5",
          borderWidth: 1,
          textStyle: { color: "#F4F8FC", fontSize: 12 },
          formatter: (params: { name?: string }) => params.name ?? "",
        },
        series: [
          {
            type: "map",
            map: MAP_NAME,
            roam: true,
            scaleLimit: { min: 0.85, max: 3.5 },
            layoutCenter: ["50%", "50%"],
            layoutSize: "88%",
            aspectScale: 0.9,
            selectedMode: false,
            itemStyle: {
              areaColor: "#142A45",
              borderColor: "#52718F",
              borderWidth: 1,
            },
            emphasis: {
              label: { show: false },
              itemStyle: {
                areaColor: "#3476AE",
                borderColor: "#E4F2FF",
                borderWidth: 1.7,
              },
            },
            data,
          },
        ],
      },
      { notMerge: false, lazyUpdate: true },
    );
  }, [activeGeo, projectGeos, bridgeGeos]);

  return (
    <div
      ref={elRef}
      className="h-full w-full"
      aria-label="Flat, upright map of India. Gold pin labels identify states with Chetas Control Systems projects; the active state is highlighted in gold."
    />
  );
}
