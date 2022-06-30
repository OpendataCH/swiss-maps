import { MapController, WebMercatorViewport } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import * as MUI from "@material-ui/core";
import clsx from "clsx";
import * as React from "react";
import { useQuery } from "react-query";
import { previewSourceUrl } from "src/shared";
import * as topojson from "topojson";
import { useImmer } from "use-immer";
import { useContext } from "../context";

interface Props {}

const INITIAL_VIEW_STATE = {
  latitude: 46.8182,
  longitude: 8.2275,
  zoom: 2,
  maxZoom: 16,
  minZoom: 2,
  pitch: 0,
  bearing: 0,
};

export const Preview = React.forwardRef(({}: Props, deckRef: any) => {
  const classes = useStyles();
  const ctx = useContext();
  const { options } = ctx.state;

  const [state, mutate] = useImmer({
    fetching: false,
    viewState: INITIAL_VIEW_STATE,
    geoData: {
      country: undefined as any,
      cantons: undefined as any,
      municipalities: undefined as any,
      lakes: undefined as any,
    },
  });

  const { data: json, isFetching } = useQuery(
    ["todos", options.year, options.simplify, ...options.shapes],
    () => fetch(previewSourceUrl(options)).then((res) => res.json())
  );

  React.useEffect(() => {
    if (!json) {
      return;
    }
    mutate((draft) => {
      if (json.objects?.country) {
        draft.geoData.country = topojson.feature(json, json.objects.country);
      }

      if (json.objects?.cantons) {
        draft.geoData.cantons = topojson.feature(json, json.objects.cantons);
      }

      if (json.objects?.municipalities) {
        draft.geoData.municipalities = topojson.feature(
          json,
          json.objects.municipalities
        );
      }

      if (json.objects?.lakes) {
        draft.geoData.lakes = topojson.feature(json, json.objects.lakes);
      }
    });
  }, [json]);

  /*
  const onViewStateChange = React.useCallback(
    ({ viewState, interactionState }) => {
      mutate((draft) => {
        if (interactionState.inTransition) {
          draft.viewState = viewState;
        } else {
          draft.viewState = constrainZoom(viewState, CH_BBOX);
        }
      });
    },
    []
  );
  */

  const onResize = React.useCallback(
    ({ width, height }) => {
      mutate((draft) => {
        draft.viewState = constrainZoom(
          { ...draft.viewState, width, height },
          CH_BBOX
        );
      });
    },
    [mutate]
  );

  return (
    <div className={clsx(classes.root, { [classes.fetching]: state.fetching })}>
      <div className={classes.loader}>
        <MUI.Fade in style={{ transitionDelay: "800ms" }}>
          <MUI.CircularProgress variant="indeterminate" size={300} />
        </MUI.Fade>
      </div>

      <DeckGL
        ref={deckRef}
        controller={{ type: MapController }}
        viewState={state.viewState}
        // onViewStateChange={onViewStateChange}
        onResize={onResize}
      >
        {options.shapes.has("country") && (
          <GeoJsonLayer
            id="country"
            data={state.geoData?.country}
            pickable={false}
            stroked={true}
            filled={true}
            getFillColor={[230, 230, 230]}
            extruded={false}
            getLineColor={[0, 0, 0, 255]}
            getRadius={100}
            lineWidthUnits="pixels"
            getLineWidth={1}
            lineMiterLimit={1}
          />
        )}

        {options.shapes.has("cantons") && (
          <GeoJsonLayer
            id="cantons"
            data={state.geoData.cantons}
            pickable={false}
            stroked={true}
            filled={false}
            getFillColor={[230, 230, 230]}
            extruded={false}
            lineWidthMinPixels={1.2}
            lineWidthMaxPixels={3.6}
            getLineWidth={200}
            lineMiterLimit={1}
            getLineColor={[120, 120, 120]}
          />
        )}

        {state.geoData.municipalities &&
          options.shapes.has("municipalities") && (
            <GeoJsonLayer
              id="municipalities"
              data={state.geoData.municipalities}
              pickable={false}
              stroked={true}
              filled={false}
              getFillColor={[230, 230, 230]}
              extruded={false}
              lineWidthMinPixels={0.5}
              lineWidthMaxPixels={1}
              getLineWidth={200}
              lineMiterLimit={1}
              getLineColor={LINE_COLOR}
            />
          )}

        {options.shapes.has("lakes") && (
          <GeoJsonLayer
            id="lakes"
            data={state.geoData.lakes}
            pickable={false}
            stroked={true}
            filled={true}
            extruded={false}
            lineWidthMinPixels={0.5}
            lineWidthMaxPixels={1}
            getLineWidth={100}
            getFillColor={[102, 175, 233]}
            getLineColor={LINE_COLOR}
          />
        )}

        {ctx.state.highlightedShape &&
          options.shapes.has(ctx.state.highlightedShape) &&
          (() => {
            const data = state.geoData[
              ctx.state.highlightedShape as keyof typeof state.geoData
            ] as $FixMe;

            if (ctx.state.highlightedShape === "lakes") {
              return (
                <GeoJsonLayer
                  id="highlight"
                  data={data}
                  pickable={false}
                  stroked={false}
                  filled={true}
                  extruded={false}
                  getFillColor={[107, 61, 125]}
                />
              );
            } else {
              return (
                <GeoJsonLayer
                  id="highlight"
                  data={data}
                  pickable={false}
                  stroked={true}
                  filled={false}
                  extruded={false}
                  lineWidthUnits="pixels"
                  getLineWidth={2}
                  getLineColor={[107, 61, 125]}
                />
              );
            }
          })()}
      </DeckGL>
    </div>
  );
});

const useStyles = MUI.makeStyles(
  (theme) => ({
    root: {
      position: "absolute",
      zIndex: 1,
      top: 0,
      left: theme.spacing(55),
      right: 0,
      bottom: 0,
      pointerEvents: "none",
    },

    fetching: {},

    loader: {
      position: "absolute",
      zIndex: 2,
      top: 0,
      left: -theme.spacing(55),
      paddingLeft: theme.spacing(55),
      right: 0,
      bottom: 0,
      pointerEvents: "none",
      opacity: 0,

      display: "grid",
      placeItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.05)",

      transition: theme.transitions.create("all", {
        duration: theme.transitions.duration.short,
      }),

      "$fetching &": {
        opacity: 1,
      },
    },
  }),
  { name: "XuiGenerator:Preview" }
);

type BBox = [[number, number], [number, number]];

const CH_BBOX: BBox = [
  [5.956800664952974, 45.81912371940225],
  [10.493446773955753, 47.80741209797084],
];

const LINE_COLOR = [100, 100, 100, 127] as const;

const constrainZoom = (
  viewState: $FixMe,
  bbox: BBox,
  { padding = 60 }: { padding?: number } = {}
) => {
  const vp = new WebMercatorViewport(viewState);

  const { width, height, zoom, longitude, latitude } = viewState;

  const [x, y] = vp.project([longitude, latitude]);
  const [x0, y1] = vp.project(bbox[0]);
  const [x1, y0] = vp.project(bbox[1]);

  const fitted = vp.fitBounds(bbox, { padding });

  const [cx, cy] = vp.project([fitted.longitude, fitted.latitude]);

  const h = height - padding * 2;
  const w = width - padding * 2;

  const h2 = h / 2;
  const w2 = w / 2;

  const y2 =
    y1 - y0 < h ? cy : y - h2 < y0 ? y0 + h2 : y + h2 > y1 ? y1 - h2 : y;
  const x2 =
    x1 - x0 < w ? cx : x - w2 < x0 ? x0 + w2 : x + w2 > x1 ? x1 - w2 : x;

  const p = vp.unproject([x2, y2]);

  return {
    ...viewState,
    transitionDuration: 0,
    transitionInterpolator: null,
    zoom: Math.max(zoom, fitted.zoom),
    longitude: p[0],
    latitude: p[1],
  };
};
