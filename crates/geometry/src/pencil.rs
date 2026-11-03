//! Pencil simplification follows FigCraft tools/pen.rs at 0e86f35 (MIT, third_party/figcraft).
use kurbo::{BezPath, PathEl};

/// Input xy pairs, output anchors [x,y,in_dx,in_dy,out_dx,out_dy]. No document state.
#[no_mangle]
pub unsafe extern "C" fn fit_pencil(input: *const f64, count: usize, tolerance: f64, output: *mut f64, capacity: usize) -> usize {
    if input.is_null() || output.is_null() || !(2..=20000).contains(&count) || !tolerance.is_finite() || tolerance <= 0.0 { return 0; }
    let points = unsafe { std::slice::from_raw_parts(input, count * 2) };
    if points.iter().any(|p| !p.is_finite()) { return 0; }
    let mut poly = BezPath::new();
    for (i, p) in points.chunks_exact(2).enumerate() {
        if i == 0 { poly.move_to((p[0],p[1])); } else { poly.line_to((p[0],p[1])); }
    }
    // Preserve deliberate corners while fitting ordinary sampled pen jitter into curves.
    let options = kurbo::simplify::SimplifyOptions::default().angle_thresh(0.3);
    let fitted = kurbo::simplify::simplify_bezpath(poly.iter(), tolerance, &options);
    let mut anchors: Vec<[f64;6]> = Vec::new();
    for el in fitted.iter() {
        match el {
            PathEl::MoveTo(p) | PathEl::LineTo(p) => anchors.push([p.x,p.y,0.0,0.0,0.0,0.0]),
            PathEl::CurveTo(c1,c2,p) => {
                if let Some(a) = anchors.last_mut() { a[4]=c1.x-a[0]; a[5]=c1.y-a[1]; }
                anchors.push([p.x,p.y,c2.x-p.x,c2.y-p.y,0.0,0.0]);
            }
            PathEl::QuadTo(c,p) => {
                if let Some(a) = anchors.last_mut() { a[4]=(c.x-a[0])*2.0/3.0; a[5]=(c.y-a[1])*2.0/3.0; }
                anchors.push([p.x,p.y,(c.x-p.x)*2.0/3.0,(c.y-p.y)*2.0/3.0,0.0,0.0]);
            }
            PathEl::ClosePath => {}
        }
    }
    if anchors.len() * 6 > capacity { return 0; }
    let result = unsafe { std::slice::from_raw_parts_mut(output, anchors.len() * 6) };
    for (i,a) in anchors.iter().enumerate() { result[i*6..i*6+6].copy_from_slice(a); }
    anchors.len()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn fits_a_stroke_preserving_endpoints() {
        let p: Vec<f64> = (0..100).flat_map(|i| [i as f64, (i as f64/15.0).sin()*20.0]).collect();
        let mut out = vec![0.0; 1200];
        let n = unsafe { fit_pencil(p.as_ptr(),100,0.75,out.as_mut_ptr(),out.len()) };
        assert!(n>=2 && n<100, "expected simplification, got {n} anchors");
        assert!((out[0]-p[0]).abs()<1e-6 && (out[(n-1)*6]-p[198]).abs()<1e-6);
    }
}
