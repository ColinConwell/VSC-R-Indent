if (!require(pacman)) {install.packages("pacman")}
pacman::p_load('skimr', 'tidyverse')

strtoi("5", base = 10L)
         
c(1, 2,
  3, 4)

6 +
  7 +
  8 *
  9 *
  4 /
  4 /
  5

ggplot(mtcars, aes(disp, mpg)) +
  geom_point() +
  coord_radial(start = -0.4 * pi, 
               end = 0.4 * pi, 
               inner.radius = 0.3)
                     

data(mtcars) %>%
  skim() %>%
  kable()

strtoi("5", 
       base=
         10L, 
       ok=
         TRUE)

ggplot(mtcars, aes(disp, mpg)) +
  geom_point() +
  coord_radial(start = -0.4 * pi, 
               end = 0.4 * pi, 
               inner.radius = 0.3) +
  # increase space between axis and plot border
  theme(text = element_text(size=12, family='sans'),
        panel.grid.minor = element_blank(),
        panel.border = element_rect(fill='transparent'))