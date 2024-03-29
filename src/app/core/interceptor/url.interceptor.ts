import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoginService } from '../service/login.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

export const urlInterceptor: HttpInterceptorFn = (req, next) => {
  let url = req.url;
  let headers = req.headers;
  let loginService = inject(LoginService);
  let toastrService = inject(ToastrService);
  let router = inject(Router);

  if (!url.startsWith('/assets/')) {
    url = 'http://localhost:8080/api/v1' + url;
    headers = headers.append('Authorization', 'Bearer ' + loginService.token);
  }
  let newReq = req.clone({
    url,
    headers,
  });
  return next(newReq).pipe(
    catchError((error) => {
      console.log(error.url);
      if (error instanceof HttpErrorResponse && error.url != 'http://localhost:8080/api/v1/login' && error.status == 403) {
        // login işlemi yapılmıyor ve token hatası döndü
        return loginService.relogin().pipe(
          switchMap((token: any) => {
            toastrService.info("Tekrar giriş yapıldı");
            headers = headers.set('Authorization', 'Bearer ' + loginService.token);
            newReq = newReq.clone({
              headers,
            });
            return next(newReq);
          }),
          catchError(error => {
            toastrService.error("Tekrar giriş başarısız oldu");
            loginService.logout();
            router.navigateByUrl('/');
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
