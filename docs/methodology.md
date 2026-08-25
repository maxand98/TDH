# Methodology

## Public measure

The Raster calculator publishes an artist-specific equivalent of AB5D's abTDH. It is a collector register, not an artist-level oTDH score. Its machine-readable identifier is `raster-artist-abtdh/1`.

The declared corpus is the artist's verified Raster-indexed oeuvre. Each current ownership address is reported independently, with a Raster collector name where available.

## Formula

For every currently held token or edition copy:

```text
complete uninterrupted days = floor(snapshot time - last acquired time)
edition weight = largest indexed artwork size / artwork indexed edition size
work contribution = complete uninterrupted days x edition weight
```

The edition weight is rounded to two decimals before multiplication. A collector's artist-specific TDH is the sum of the weighted work contributions currently held by that address:

```text
collector artist-TDH = sum of weighted current-work days
```

The published `daily_rate` is the number of weighted points the collector earns for one additional uninterrupted day if the current holdings do not change.

## Required behaviours

- Only works still held at the declared snapshot contribute.
- Disposal ends a holding interval; reacquisition starts a new one.
- Edition size resists the domination of very large series.
- Raster-listed artist addresses and identified marketplace custody are excluded.
- Price, transaction value, floor price, sales volume, reputation and artistic judgment have zero weight.
- Every formula change creates a new methodology version.

## Required published evidence

Every register publishes:

- methodology and schema version;
- snapshot timestamp;
- artist and Raster profile;
- indexed artwork and token counts;
- reference edition size;
- chain coverage;
- exclusion policy;
- the complete ranked collector-address corpus;
- current works, raw work-days, weighted TDH, daily rate and current acquisition boundaries for each collector.

An uncovered Raster profile is reported as uncovered, never as a zero score.
